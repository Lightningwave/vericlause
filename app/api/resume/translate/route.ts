export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    zh: "Simplified Chinese (简体中文)",
    ms: "Bahasa Melayu",
    ta: "Tamil (தமிழ்)",
  };
  return names[code] || "English";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { resumeData, text, targetLanguage } = body as {
    resumeData?: unknown;
    text?: string;
    targetLanguage?: string;
  };
  const isTextMode = typeof text === "string";

  if (!targetLanguage || targetLanguage === "en") {
    return NextResponse.json(isTextMode ? { translatedText: text } : { translatedData: resumeData });
  }

  const langName = getLanguageName(targetLanguage);
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(isTextMode ? { translatedText: text } : { translatedData: resumeData });
  }

  try {
    const client = new OpenAI({ apiKey: openaiKey });

    if (isTextMode) {
      // Raw text translation mode
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `Translate the following resume text to ${langName}. Preserve all formatting, dates, numbers, and proper nouns. Return only the translated text.`,
          },
          { role: "user", content: text! },
        ],
      });
      const translatedText = response.choices[0]?.message?.content ?? text!;
      return NextResponse.json({ translatedText });
    }

    // JSON object translation mode
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Translate all string values in the given JSON object to ${langName}. Preserve the JSON structure and all keys exactly. Only translate the values. Return only valid JSON with no extra text.`,
        },
        {
          role: "user",
          content: JSON.stringify(resumeData),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const braceStart = raw.indexOf("{");
    const braceEnd = raw.lastIndexOf("}");
    if (braceStart === -1 || braceEnd <= braceStart) {
      return NextResponse.json({ translatedData: resumeData });
    }
    const translatedData = JSON.parse(raw.slice(braceStart, braceEnd + 1));
    return NextResponse.json({ translatedData });
  } catch {
    // Graceful degradation — return original data untranslated
    return NextResponse.json(isTextMode ? { translatedText: text } : { translatedData: resumeData });
  }
}
