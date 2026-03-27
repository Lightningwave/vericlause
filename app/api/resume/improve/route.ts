export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { getAuthenticatedUser } from "@/lib/services/db";

const OPENAI_MODEL = "gpt-4o-mini";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are a professional resume writer specialising in Singapore's white-collar job market.

You will be given an original resume and a list of AI feedback suggestions. Rewrite the resume incorporating ALL the suggestions to produce a stronger, more competitive version.

Rules:
- Keep all factual information (dates, companies, roles) exactly as they are
- Improve the language, structure and impact of each bullet point
- Add stronger action verbs and quantifiable outcomes where missing
- Make it ATS-friendly with relevant Singapore market keywords
- Return ONLY the improved resume as plain text, ready to copy
- Do not add fictional achievements or qualifications`;

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
        temperature: 0.3,
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err) {
      console.warn("OpenAI improve failed, falling back to Groq:", err);
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
    temperature: 0.3,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { resumeText, feedback } = await req.json();

  if (!resumeText?.trim()) {
    return NextResponse.json({ detail: "No resume text provided" }, { status: 400 });
  }

  const feedbackLines = Array.isArray(feedback) && feedback.length > 0
    ? feedback.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")
    : "No specific feedback provided — improve overall quality.";

  const prompt = `ORIGINAL RESUME:\n${resumeText}\n\nAI FEEDBACK TO INCORPORATE:\n${feedbackLines}`;

  try {
    const improvedResume = await callLlm(prompt);
    return NextResponse.json({ improvedResume });
  } catch (e) {
    return NextResponse.json(
      { detail: `Failed to generate improved resume: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
