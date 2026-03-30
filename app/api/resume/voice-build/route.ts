export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { getAuthenticatedUser, insertResume } from "@/lib/services/db";
import type { ResumeProfile, ResumeSuggestion } from "@/lib/types";
import type { ResumeFeedback } from "@/app/api/resume/route";

const OPENAI_MODEL = "gpt-4o-mini";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const FEEDBACK_SYSTEM_PROMPT = `You are an elite Singapore resume advisor: language coach, ATS specialist, Singapore market expert (MOM standards, local hiring norms), and career progression analyst. Be specific — always reference actual resume content, never generic advice. Salary benchmarks must be SGD Singapore market rates.

Return ONLY valid JSON with exactly these fields:

{"overallImpression":"3–4 sentences: profile strength, Singapore market positioning, target role fit","keyStrengths":["specific strength referencing actual resume content","strength 2","strength 3"],"areasToImprove":["specific gap explaining why it weakens the resume in Singapore's market","gap 2","gap 3"],"suggestedEdits":["exact rewrite (not advice) e.g. change 'Managed social media' to 'Grew combined social following 40% to 120k'","edit 2","edit 3"],"atsAnalysis":{"keywordsFound":["kw1","kw2"],"keywordsMissing":["missing1","missing2"],"atsFriendly":true,"atsNotes":"One sentence on ATS suitability"},"careerProgression":"2 sentences on trajectory logic and competitiveness for the candidate's level in Singapore","salaryBenchmark":{"estimatedRange":"SGD X,000–Y,000/month","rationale":"One sentence based on role, sector, and years of experience"},"score":5}

Score rubric (1–10): 2pts quantified achievements with numbers; 2pts Singapore market/MOM alignment; 2pts structure/ATS compatibility; 2pts action verb quality; 2pts completeness (contact, history, education, skills).

No text outside the JSON.`;

function feedbackToSuggestions(feedback: ResumeFeedback): ResumeSuggestion[] {
  const suggestions: ResumeSuggestion[] = [];
  for (const edit of feedback.suggestedEdits ?? []) {
    suggestions.push({ type: "enhancement", priority: "medium", category: "content", suggestion: edit });
  }
  for (const area of feedback.areasToImprove ?? []) {
    suggestions.push({ type: "content_gap", priority: "high", category: "content", suggestion: area });
  }
  for (const kw of feedback.atsAnalysis?.keywordsMissing ?? []) {
    suggestions.push({ type: "ats_optimization", priority: "medium", category: "keywords", suggestion: `Add keyword: "${kw}"` });
  }
  return suggestions;
}

async function generateFeedback(rawText: string, language?: string): Promise<ResumeFeedback | null> {
  const feedbackPrompt = buildLanguageInstruction(language) + FEEDBACK_SYSTEM_PROMPT;
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    let raw = "";
    if (openaiKey) {
      try {
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: feedbackPrompt },
            { role: "user", content: rawText.slice(0, 12000) },
          ],
          temperature: 0,
        });
        raw = response.choices[0]?.message?.content ?? "";
      } catch {
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
          const client = new Groq({ apiKey: groqKey });
          const response = await client.chat.completions.create({
            model: GROQ_FALLBACK_MODEL,
            messages: [
              { role: "system", content: feedbackPrompt },
              { role: "user", content: rawText.slice(0, 12000) },
            ],
            temperature: 0,
          });
          raw = response.choices[0]?.message?.content ?? "";
        }
      }
    }
    if (!raw) return null;
    const braceStart = raw.indexOf("{");
    const braceEnd = raw.lastIndexOf("}");
    if (braceStart === -1 || braceEnd <= braceStart) return null;
    return JSON.parse(raw.slice(braceStart, braceEnd + 1)) as ResumeFeedback;
  } catch {
    return null;
  }
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    zh: "Simplified Chinese (简体中文)",
    ms: "Bahasa Melayu",
    ta: "Tamil (தமிழ்)",
  };
  return names[code] || "English";
}

function buildLanguageInstruction(language?: string): string {
  if (!language || language === "en") return "";
  const langName = getLanguageName(language);
  return `IMPORTANT: All text values in the JSON output must be written in ${langName}. Do not use English in any field value.\n\n`;
}

const BASE_COMPILATION_PROMPT = `You are a professional resume writer for Singapore's job market. The user has provided raw voice transcript answers to resume questions. The transcripts may have errors or incomplete sentences from speech recognition.

Auto-correct the language, fix grammar, and compile the answers into a clean, professionally formatted resume. Keep all facts as stated. For a simplified entry-level resume, focus on clarity over complexity.

If the candidate's name appears to contain individual letters separated by spaces (e.g. J A Y S O N), reconstruct it as a single proper name. Strip any leading or trailing hash symbols or special characters from the name before saving.

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

async function callLlm(prompt: string, language?: string): Promise<string> {
  const systemPrompt = buildLanguageInstruction(language) + BASE_COMPILATION_PROMPT;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
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
      { role: "system", content: systemPrompt },
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

  const body = await req.json();
  const { language, ...answers } = body ?? {};

  // TASK E: Input validation — block empty or near-empty submissions
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "No answers provided" }, { status: 400 });
  }

  const allValues = [
    answers.full_name, answers.age, answers.job_title,
    answers.summary, answers.experience, answers.achievement,
    answers.education, answers.skills, answers.anything_else,
  ];
  const nonEmptyCount = allValues.filter(
    (v) => typeof v === "string" && v.trim().length > 0
  ).length;
  if (nonEmptyCount < 3) {
    return NextResponse.json(
      { error: "Please answer at least 3 questions before generating your resume" },
      { status: 400 },
    );
  }

  // TASK C: Age guard — only pass age to the prompt if it's a valid number between 15 and 80.
  // Voice transcription can produce garbled numbers; invalid ages are silently dropped
  // rather than sent to the LLM where they'd pollute the resume.
  let sanitizedAge: string | null = null;
  if (answers.age) {
    const parsed = Number(answers.age);
    if (!Number.isNaN(parsed) && parsed >= 15 && parsed <= 80) {
      sanitizedAge = String(parsed);
    }
  }

  const prompt = [
    answers.full_name ? `Full Name: ${answers.full_name}` : "",
    sanitizedAge ? `Age: ${sanitizedAge}` : "",
    answers.job_title ? `Target Role: ${answers.job_title}` : "",
    answers.summary ? `Professional Summary (voice): ${answers.summary}` : "",
    answers.experience ? `Work Experience (voice): ${answers.experience}` : "",
    answers.achievement ? `Key Achievement (voice): ${answers.achievement}` : "",
    answers.education ? `Education (voice): ${answers.education}` : "",
    answers.skills ? `Skills (voice): ${answers.skills}` : "",
    answers.anything_else ? `Additional information (voice): ${answers.anything_else}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await callLlm(prompt, language);
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

    // Build a raw_text representation so the resume is searchable/readable in Supabase.
    // The name must be the bare first line (no "Name:" prefix) so extractCandidateName
    // in the review page can find it — that function filters lines containing "Name:".
    const rawText = [
      result.name || "",
      result.targetRole ? `Target Role: ${result.targetRole}` : "",
      result.summary ? `Summary:\n${result.summary}` : "",
      result.experience ? `Experience:\n${result.experience}` : "",
      result.education ? `Education:\n${result.education}` : "",
      result.skills ? `Skills:\n${result.skills}` : "",
      result.certifications ? `Certifications:\n${result.certifications}` : "",
    ].filter(Boolean).join("\n\n");

    const fileName = result.name ? `${result.name} - Voice Resume` : "Voice Resume";
    const feedback = await generateFeedback(rawText, language);
    const aiSuggestions = feedback ? feedbackToSuggestions(feedback) : null;
    const saved = await insertResume(user.id, fileName, rawText, profile, undefined, undefined, aiSuggestions);

    return NextResponse.json({ success: true, resumeId: saved.id, resumeData: result, feedback });
  } catch (e) {
    return NextResponse.json(
      { detail: `Resume generation failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
