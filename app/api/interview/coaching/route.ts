export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Groq from "groq-sdk";

const OPENAI_MODEL = "gpt-4o-mini";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are an expert interview coach reviewing a mock interview conversation for a Singapore job seeker.

Analyse the candidate's answers so far and return ONLY a valid JSON object with exactly these fields:
{
  "score": a number from 0 to 100 reflecting overall interview performance so far,
  "strengths": an array of 2 specific things the candidate did well in their answers,
  "improvements": an array of 2 specific coaching suggestions to improve their answers
}

Be specific and practical. Reference actual things the candidate said. No generic advice.`;

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

export async function POST(req: NextRequest) {
  try {
    const { conversation } = await req.json();

    if (!Array.isArray(conversation) || conversation.length === 0) {
      return NextResponse.json({ error: "No conversation provided" }, { status: 400 });
    }

    const transcript = conversation
      .filter((m: { speaker: string; text: string }) => m.speaker !== "system")
      .map((m: { speaker: string; text: string }) =>
        `${m.speaker === "agent" ? "Interviewer" : "Candidate"}: ${m.text}`
      )
      .join("\n");

    let raw = "";

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: transcript },
          ],
          temperature: 0,
        });
        raw = response.choices[0]?.message?.content ?? "";
      } catch (err) {
        console.warn("OpenAI coaching failed, falling back to Groq:", err);
      }
    }

    if (!raw) {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        return NextResponse.json({ error: "No AI API key configured" }, { status: 500 });
      }
      const client = new Groq({ apiKey: groqKey });
      const response = await client.chat.completions.create({
        model: GROQ_FALLBACK_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
        temperature: 0,
      });
      raw = response.choices[0]?.message?.content ?? "";
    }

    const parsed = JSON.parse(extractJson(raw));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Coaching route error:", err);
    return NextResponse.json({ error: "Failed to generate coaching" }, { status: 500 });
  }
}
