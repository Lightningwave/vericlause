import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedUser } from "@/lib/services/db";
import { maxJsonBodyBytes, parseJsonBody } from "@/lib/api/limits";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";
import { hasFeatureAccess } from "@/lib/billing/access";
import type { ResumeProfile, ResumeSuggestion } from "@/lib/types";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

function buildImprovePrompt(params: {
  rawText: string;
  profile?: ResumeProfile | null;
  suggestions?: ResumeSuggestion[] | null;
  targetRole?: string | null;
}) {
  const { rawText, profile, suggestions, targetRole } = params;

  return `
You are an expert resume coach.

Rewrite and improve the user's resume content so it is clearer, stronger, and more professional while staying truthful to the original experience.

Rules:
- Do not invent experience, metrics, employers, dates, skills, or qualifications.
- Improve clarity, grammar, structure, and impact.
- Prefer concise, achievement-oriented bullet points where possible.
- Keep the content ATS-friendly.
- If a target role is provided, tailor phrasing toward that role without fabricating anything.
- Return valid JSON only.
- Do not include markdown fences.

Return JSON with this exact shape:
{
  "summary": "string",
  "improved_experience": ["string"],
  "improved_skills": ["string"],
  "improved_projects": ["string"],
  "additional_recommendations": ["string"]
}

Target role:
${targetRole ?? ""}

Resume profile JSON:
${JSON.stringify(profile ?? null)}

Resume suggestions JSON:
${JSON.stringify(suggestions ?? [])}

Raw resume text:
${rawText}
`.trim();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const canImprove = await hasFeatureAccess(user.id, "resumeImprove");
  if (!canImprove) {
    return NextResponse.json(
      {
        detail: "Resume improve is available on Pro and Business plans.",
      },
      { status: 403 },
    );
  }

  if (!allowRateLimit(user.id, "llm")) {
    return rateLimitedResponse(60);
  }

  const jsonIn = await parseJsonBody<{
    rawText: string;
    profile?: ResumeProfile | null;
    suggestions?: ResumeSuggestion[] | null;
    targetRole?: string | null;
  }>(req, maxJsonBodyBytes());

  if (!jsonIn.ok) {
    return jsonIn.response;
  }

  const { rawText, profile, suggestions, targetRole } = jsonIn.data;

  if (!rawText || !rawText.trim()) {
    return NextResponse.json(
      { detail: "rawText is required." },
      { status: 400 },
    );
  }

  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a precise resume improvement assistant. Return valid JSON only.",
        },
        {
          role: "user",
          content: buildImprovePrompt({
            rawText,
            profile,
            suggestions,
            targetRole,
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      summary?: string;
      improved_experience?: string[];
      improved_skills?: string[];
      improved_projects?: string[];
      additional_recommendations?: string[];
    };

    return NextResponse.json({
      summary: parsed.summary ?? "",
      improved_experience: Array.isArray(parsed.improved_experience)
        ? parsed.improved_experience
        : [],
      improved_skills: Array.isArray(parsed.improved_skills)
        ? parsed.improved_skills
        : [],
      improved_projects: Array.isArray(parsed.improved_projects)
        ? parsed.improved_projects
        : [],
      additional_recommendations: Array.isArray(
        parsed.additional_recommendations,
      )
        ? parsed.additional_recommendations
        : [],
    });
  } catch (error) {
    console.error("Resume improve failed:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Resume improve failed",
      },
      { status: 500 },
    );
  }
}