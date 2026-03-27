export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { getAuthenticatedUser } from "@/lib/services/db";

const OPENAI_MODEL = "gpt-4o-mini";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are a resume evaluator for Singapore's white-collar job market.

Read the resume below and return ONLY a valid JSON object with one field:
{ "score": 7 }

Score from 1 to 10 based on: clarity, impact, ATS-friendliness, use of action verbs, and overall competitiveness for Singapore hiring managers.
No explanation. No other text. Just the JSON.`;

async function callLlm(text: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, 120_000) },
        ],
        temperature: 0,
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err) {
      console.warn("OpenAI rescore failed, falling back to Groq:", err);
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("Neither OPENAI_API_KEY nor GROQ_API_KEY is set");

  const client = new Groq({ apiKey: groqKey });
  const response = await client.chat.completions.create({
    model: GROQ_FALLBACK_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text.slice(0, 120_000) },
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

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ detail: "No resume text provided" }, { status: 400 });
  }

  try {
    const raw = await callLlm(text);
    const braceStart = raw.indexOf("{");
    const braceEnd = raw.lastIndexOf("}");
    const json = JSON.parse(raw.slice(braceStart, braceEnd + 1));
    const score = typeof json.score === "number" ? Math.min(10, Math.max(1, json.score)) : null;
    if (score === null) throw new Error("Invalid score returned");
    return NextResponse.json({ score });
  } catch (e) {
    return NextResponse.json(
      { detail: `Rescore failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
