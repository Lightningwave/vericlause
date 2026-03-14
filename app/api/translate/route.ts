import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedUser } from "@/lib/services/db";
import type { ComplianceVerdict, TranslationLanguage } from "@/lib/types";

const LANGUAGE_LABELS: Record<TranslationLanguage, string> = {
  zh: "Simplified Chinese (简体中文)",
  ta: "Tamil (தமிழ்)",
};

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { verdicts, language } = body as {
    verdicts: ComplianceVerdict[];
    language: TranslationLanguage;
  };

  if (!verdicts?.length || !language || !LANGUAGE_LABELS[language]) {
    return NextResponse.json(
      { detail: "verdicts array and language (zh | ta) are required" },
      { status: 400 },
    );
  }

  const langLabel = LANGUAGE_LABELS[language];

  const toTranslate = verdicts.map((v, i) => ({
    i,
    contract_value: v.contract_value ?? "",
    law_value: v.law_value ?? "",
    explanation: v.explanation ?? "",
  }));

  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a professional legal translator. Translate the user-provided JSON array of verdict fields into ${langLabel}. Keep legal terminology accurate. Return a JSON object with key "translations" containing an array of objects, each with fields: i (index), contract_value, law_value, explanation — all translated. Do not translate statute section numbers or act names (keep those in English).`,
      },
      {
        role: "user",
        content: JSON.stringify(toTranslate),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: { translations?: Array<{ i: number; contract_value: string; law_value: string; explanation: string }> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ detail: "Translation LLM returned invalid JSON" }, { status: 502 });
  }

  const translations = parsed.translations ?? [];

  const translatedVerdicts: ComplianceVerdict[] = verdicts.map((v, idx) => {
    const t = translations.find((tr) => tr.i === idx);
    return {
      ...v,
      translated_contract_value: t?.contract_value ?? null,
      translated_law_value: t?.law_value ?? null,
      translated_explanation: t?.explanation ?? null,
    };
  });

  return NextResponse.json({ verdicts: translatedVerdicts, language });
}
