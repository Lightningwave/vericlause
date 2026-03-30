export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { getAuthenticatedUser, insertResume } from "@/lib/services/db";
import type { ResumeProfile } from "@/lib/types";

const OPENAI_MODEL = "gpt-4o-mini";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are a professional resume writer for Singapore's job market. The user has provided raw voice transcript answers to resume questions. The transcripts may have errors or incomplete sentences from speech recognition.

Auto-correct the language, fix grammar, and compile the answers into a clean, professionally formatted resume. Keep all facts as stated. For a simplified entry-level resume, focus on clarity over complexity.

Return ONLY a valid JSON object with exactly these fields:
{
  "name": "string",
  "age": "string",
  "targetRole": "string",
  "summary": "string",
  "experience": "string",
  "education": "string",
  "skills": "string",
  "certifications": "string"
}

No text outside the JSON. If a field has no data, return an empty string for it.`;

async function callLlm(prompt: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err) {
      console.warn("OpenAI voice-build failed, falling back to Groq:", err);
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("Neither OPENAI_API_KEY nor GROQ_API_KEY is set");

  const client = new Groq({ apiKey: groqKey });
  const response = await client.chat.completions.create({
    model: GROQ_FALLBACK_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const answers = await req.json();

  const prompt = [
    answers.full_name ? `Full Name: ${answers.full_name}` : "",
    answers.age ? `Age: ${answers.age}` : "",
    answers.job_title ? `Target Role: ${answers.job_title}` : "",
    answers.summary ? `Professional Summary (voice): ${answers.summary}` : "",
    answers.experience ? `Work Experience (voice): ${answers.experience}` : "",
    answers.achievement ? `Key Achievement (voice): ${answers.achievement}` : "",
    answers.education ? `Education (voice): ${answers.education}` : "",
    answers.skills ? `Skills (voice): ${answers.skills}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await callLlm(prompt);
    const braceStart = raw.indexOf("{");
    const braceEnd = raw.lastIndexOf("}");
    if (braceStart === -1 || braceEnd <= braceStart) {
      throw new Error("No JSON returned from AI");
    }
    const result = JSON.parse(raw.slice(braceStart, braceEnd + 1));

    // Build a ResumeProfile from the AI output and save to Supabase
    const profile: ResumeProfile = {
      headline: result.targetRole || null,
      summary: result.summary || null,
      skills: result.skills
        ? result.skills.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean)
        : [],
      years_experience: null,
      experiences: result.experience
        ? [{ title: result.targetRole || null, company: null, start_date: null, end_date: null, description: result.experience }]
        : [],
      education: result.education
        ? [{ institution: null, qualification: result.education, field_of_study: null, graduation_year: null }]
        : [],
      target_roles: result.targetRole ? [result.targetRole] : [],
      target_industries: [],
      location_preference: null,
      seniority_level: null,
    };

    // Build a raw_text representation so the resume is searchable/readable in Supabase
    const rawText = [
      result.name ? `Name: ${result.name}` : "",
      result.targetRole ? `Target Role: ${result.targetRole}` : "",
      result.summary ? `Summary:\n${result.summary}` : "",
      result.experience ? `Experience:\n${result.experience}` : "",
      result.education ? `Education:\n${result.education}` : "",
      result.skills ? `Skills:\n${result.skills}` : "",
      result.certifications ? `Certifications:\n${result.certifications}` : "",
    ].filter(Boolean).join("\n\n");

    const fileName = result.name ? `${result.name} - Voice Resume` : "Voice Resume";
    const saved = await insertResume(user.id, fileName, rawText, profile);

    return NextResponse.json({ ...result, resume_id: saved.id });
  } catch (e) {
    return NextResponse.json(
      { detail: `Resume generation failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
