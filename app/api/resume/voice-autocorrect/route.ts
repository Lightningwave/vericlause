export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request: Request) {
  let body: { text?: string; questionType?: string; language?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { text, questionType, language } = body;

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "Missing required field: text" },
      { status: 400 },
    );
  }

  const qType = questionType ?? "general";
  const lang = language ?? "en";

  // --- Age validation: handled locally, no LLM needed ---
  if (qType === "age") {
    const match = text.match(/\d+/);
    if (match) {
      return NextResponse.json({ corrected: match[0], valid: true });
    }
    return NextResponse.json({ corrected: "INVALID", valid: false });
  }

  // --- Build system prompt ---
  let systemPrompt =
    "You are a speech-to-text post-processor. " +
    "Correct transcription errors where words sound similar but do not fit the context. " +
    "Preserve proper nouns and names exactly unless they are clearly garbled. " +
    "Return only the corrected text with no explanation.";

  if (qType === "name") {
    systemPrompt +=
      " If the text appears to be a name spelled out letter by letter " +
      '(e.g. "J A Y S O N"), reconstruct it as a proper name (e.g. "Jayson").';
  }

  if (lang !== "en") {
    systemPrompt += ` The text is in language code "${lang}". Preserve the original language.`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    });

    const corrected = completion.choices[0]?.message?.content?.trim() ?? text;

    return NextResponse.json({ corrected, valid: true });
  } catch (err) {
    console.error("[voice-autocorrect] OpenAI error:", err);
    // Graceful degradation: return original text uncorrected
    return NextResponse.json({ corrected: text, valid: true });
  }
}
