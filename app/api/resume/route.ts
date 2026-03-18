export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { extractText } from 'unpdf';
import { getAuthenticatedUser } from "@/lib/services/db";

const OPENAI_MODEL = "gpt-4o-mini";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are a professional resume coach specialising in Singapore's white-collar job market.

Analyse the resume below and return ONLY a valid JSON object with exactly these fields:

{
  "overallImpression": "2 to 3 sentence summary",
  "keyStrengths": ["strength 1", "strength 2", "strength 3"],
  "areasToImprove": ["gap 1", "gap 2", "gap 3"],
  "suggestedEdits": ["edit 1", "edit 2", "edit 3"],
  "score": 7
}

Be specific to Singapore hiring standards. No generic advice. No text outside the JSON object.`;

export interface ResumeFeedback {
  overallImpression: string;
  keyStrengths: string[];
  areasToImprove: string[];
  suggestedEdits: string[];
  score: number;
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }

  return text.trim();
}

async function callLlm(resumeText: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: resumeText.slice(0, 120_000) },
        ],
        temperature: 0,
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err) {
      console.warn("OpenAI resume analysis failed, falling back to Groq:", err);
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("Neither OPENAI_API_KEY nor GROQ_API_KEY is set");

  const client = new Groq({ apiKey: groqKey });
  const response = await client.chat.completions.create({
    model: GROQ_FALLBACK_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: resumeText.slice(0, 120_000) },
    ],
    temperature: 0,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  const name = (file as File).name ?? "";
  const lower = name.toLowerCase();
  if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
    return NextResponse.json(
      { detail: "Only PDF and DOCX files are accepted" },
      { status: 400 },
    );
  }

  let resumeText: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const { text } = await extractText(uint8Array, { mergePages: true });
    resumeText = text;
  } catch (e) {
    return NextResponse.json(
      { detail: `File could not be read: ${e instanceof Error ? e.message : e}` },
      { status: 422 },
    );
  }

  if (!resumeText.trim()) {
    return NextResponse.json({ detail: "File produced no text" }, { status: 422 });
  }

  let raw: string;
  try {
    raw = await callLlm(resumeText);
  } catch (e) {
    return NextResponse.json(
      { detail: `AI analysis failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  const content = extractJson(raw);
  let feedback: ResumeFeedback;
  try {
    feedback = JSON.parse(content) as ResumeFeedback;
  } catch {
    return NextResponse.json(
      { detail: "AI returned an unexpected response. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ feedback });
}
