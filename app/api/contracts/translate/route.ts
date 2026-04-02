import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedUser } from "@/lib/services/db";
import { maxJsonBodyBytes, parseJsonBody } from "@/lib/api/limits";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";
import { hasFeatureAccess } from "@/lib/billing/access";
import type { ComplianceVerdict, TranslationLanguage } from "@/lib/types";

const SUPPORTED_LANGUAGES: TranslationLanguage[] = ["zh", "ms", "ta"];

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

function isSupportedLanguage(value: string): value is TranslationLanguage {
  return SUPPORTED_LANGUAGES.includes(value as TranslationLanguage);
}

function buildTranslationPrompt(
  verdicts: ComplianceVerdict[],
  language: TranslationLanguage,
) {
  return `
Translate the explanation fields of these compliance verdicts into "${language}".

Rules:
- Preserve the JSON structure exactly.
- Do not remove or rename keys.
- Only translate user-facing natural language fields such as:
  - explanation
  - recommendation
  - clause_summary
  - translated_explanation
- Keep legal meaning accurate and concise.
- Do not add markdown fences.
- Return valid JSON only.

Input JSON:
${JSON.stringify(verdicts)}
`.trim();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const canTranslate = await hasFeatureAccess(user.id, "verdictTranslation");
  if (!canTranslate) {
    return NextResponse.json(
      {
        detail:
          "Verdict translation is available on Pro and Business plans.",
      },
      { status: 403 },
    );
  }

  if (!allowRateLimit(user.id, "llm")) {
    return rateLimitedResponse(60);
  }

  const jsonIn = await parseJsonBody<{
    verdicts: ComplianceVerdict[];
    language: string;
  }>(req, maxJsonBodyBytes());

  if (!jsonIn.ok) {
    return jsonIn.response;
  }

  const { verdicts, language } = jsonIn.data;

  if (!Array.isArray(verdicts) || verdicts.length === 0) {
    return NextResponse.json(
      { detail: "A non-empty verdicts array is required." },
      { status: 400 },
    );
  }

  if (!language || !isSupportedLanguage(language)) {
    return NextResponse.json(
      {
        detail: `Unsupported language. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a precise legal translation assistant. Return valid JSON only.",
        },
        {
          role: "user",
          content: buildTranslationPrompt(verdicts, language),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      verdicts?: ComplianceVerdict[];
    };

    if (!Array.isArray(parsed.verdicts)) {
      throw new Error("Model returned invalid translation payload.");
    }

    return NextResponse.json({
      verdicts: parsed.verdicts,
      language,
    });
  } catch (error) {
    console.error("Translation failed:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Translation failed",
      },
      { status: 500 },
    );
  }
}