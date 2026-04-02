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

function buildVoiceResumePrompt(params: {
  transcript: string;
  existingProfile?: ResumeProfile | null;
  suggestions?: ResumeSuggestion[] | null;
  targetRole?: string | null;
}) {
  const { transcript, existingProfile, suggestions, targetRole } = params;

  return `
You are a resume-building assistant.

The user has spoken or dictated career information in natural language. Convert it into a structured resume draft.

Rules:
- Use only information supported by the transcript or existing profile.
- Do not invent employers, dates, achievements, degrees, or certifications.
- If details are missing, leave them out rather than guessing.
- Make the writing professional, clear, concise, and ATS-friendly.
- Tailor phrasing toward the target role if provided, without fabricating facts.
- Return valid JSON only.
- Do not include markdown fences.

Return JSON with this exact structure:
{
  "headline": "string",
  "summary": "string",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "dates": "string",
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "qualification": "string",
      "institution": "string",
      "dates": "string"
    }
  ],
  "skills": ["string"],
  "projects": ["string"],
  "certifications": ["string"],
  "missing_details": ["string"]
}

Target role:
${targetRole ?? ""}

Existing profile JSON:
${JSON.stringify(existingProfile ?? null)}

Existing suggestions JSON:
${JSON.stringify(suggestions ?? [])}

Transcript:
${transcript}
`.trim();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const canUseVoiceResume = await hasFeatureAccess(user.id, "voiceResume");
  if (!canUseVoiceResume) {
    return NextResponse.json(
      {
        detail: "Voice resume builder is available on Pro and Business plans.",
      },
      { status: 403 },
    );
  }

  if (!allowRateLimit(user.id, "llm")) {
    return rateLimitedResponse(60);
  }

  const jsonIn = await parseJsonBody<{
    transcript: string;
    existingProfile?: ResumeProfile | null;
    suggestions?: ResumeSuggestion[] | null;
    targetRole?: string | null;
  }>(req, maxJsonBodyBytes());

  if (!jsonIn.ok) {
    return jsonIn.response;
  }

  const { transcript, existingProfile, suggestions, targetRole } = jsonIn.data;

  if (!transcript || !transcript.trim()) {
    return NextResponse.json(
      { detail: "transcript is required." },
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
            "You are a precise resume-building assistant. Return valid JSON only.",
        },
        {
          role: "user",
          content: buildVoiceResumePrompt({
            transcript,
            existingProfile,
            suggestions,
            targetRole,
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      headline?: string;
      summary?: string;
      experience?: Array<{
        title?: string;
        company?: string;
        dates?: string;
        bullets?: string[];
      }>;
      education?: Array<{
        qualification?: string;
        institution?: string;
        dates?: string;
      }>;
      skills?: string[];
      projects?: string[];
      certifications?: string[];
      missing_details?: string[];
    };

    return NextResponse.json({
      headline: parsed.headline ?? "",
      summary: parsed.summary ?? "",
      experience: Array.isArray(parsed.experience)
        ? parsed.experience.map((item) => ({
            title: item?.title ?? "",
            company: item?.company ?? "",
            dates: item?.dates ?? "",
            bullets: Array.isArray(item?.bullets) ? item.bullets : [],
          }))
        : [],
      education: Array.isArray(parsed.education)
        ? parsed.education.map((item) => ({
            qualification: item?.qualification ?? "",
            institution: item?.institution ?? "",
            dates: item?.dates ?? "",
          }))
        : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications
        : [],
      missing_details: Array.isArray(parsed.missing_details)
        ? parsed.missing_details
        : [],
    });
  } catch (error) {
    console.error("Voice resume build failed:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Voice resume build failed",
      },
      { status: 500 },
    );
  }
}