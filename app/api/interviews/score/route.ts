import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedUser } from "@/lib/services/db";
import { hasFeatureAccess } from "@/lib/billing/access";
import type { InterviewScoreResult } from "@/lib/types";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

const INTERVIEWER_CONTEXT = {
  alex: {
    name: "Alex",
    style:
      "Hiring Manager. Evaluate clarity, technical depth, structured thinking, ownership, and practical delivery.",
  },
  sophia: {
    name: "Sophia",
    style:
      "Senior Executive Recruiter. Evaluate communication, leadership, collaboration, motivation, and behavioural examples.",
  },
} as const;

const ALLOWED_DIMENSION_KEYS = [
  "clarity_communication",
  "role_relevance",
  "technical_or_leadership_depth",
  "problem_solving_examples",
  "structure_conciseness",
  "confidence_presence",
] as const;

type AllowedDimensionKey = (typeof ALLOWED_DIMENSION_KEYS)[number];

function buildPrompt(params: {
  interviewer: "alex" | "sophia";
  transcript: Array<{ role: "user" | "agent"; text: string }>;
}) {
  const interviewer =
    INTERVIEWER_CONTEXT[params.interviewer] ?? INTERVIEWER_CONTEXT.alex;

  return `
You are scoring a mock interview transcript.

Interviewer:
${interviewer.name}
${interviewer.style}

Return valid JSON only with this exact shape:
{
  "overall_score": number,
  "confidence": "low" | "medium" | "high",
  "strengths": ["string"],
  "improvements": ["string"],
  "summary": "string",
  "dimensions": [
    {
      "key": "clarity_communication" | "role_relevance" | "technical_or_leadership_depth" | "problem_solving_examples" | "structure_conciseness" | "confidence_presence",
      "label": "string",
      "score": number,
      "reason": "string"
    }
  ],
  "evidence_quotes": ["string"]
}

Scoring rules:
- Score from 0 to 100.
- Be fair and concise.
- Base feedback only on the transcript provided.
- If the transcript is short, lower confidence.
- strengths and improvements should each contain 2 to 4 short items.
- summary should be 1 to 3 sentences.
- dimensions should contain 3 to 6 scoring dimensions.
- evidence_quotes should contain 1 to 3 short quotes copied from the transcript.
- For each dimension, use exactly one of the allowed key values above.
- Use key, label, score, and reason.

Transcript:
${JSON.stringify(params.transcript)}
`.trim();
}

function inferDimensionKey(value: {
  key?: unknown;
  label?: unknown;
  name?: unknown;
}): AllowedDimensionKey {
  const raw =
    typeof value.key === "string"
      ? value.key
      : typeof value.label === "string"
        ? value.label
        : typeof value.name === "string"
          ? value.name
          : "";

  const normalized = raw.toLowerCase().trim();

  if (
    normalized.includes("clarity") ||
    normalized.includes("communication")
  ) {
    return "clarity_communication";
  }

  if (
    normalized.includes("role") ||
    normalized.includes("relevance") ||
    normalized.includes("fit")
  ) {
    return "role_relevance";
  }

  if (
    normalized.includes("technical") ||
    normalized.includes("leadership") ||
    normalized.includes("depth")
  ) {
    return "technical_or_leadership_depth";
  }

  if (
    normalized.includes("problem") ||
    normalized.includes("solving") ||
    normalized.includes("example")
  ) {
    return "problem_solving_examples";
  }

  if (
    normalized.includes("structure") ||
    normalized.includes("concise") ||
    normalized.includes("conciseness") ||
    normalized.includes("organized")
  ) {
    return "structure_conciseness";
  }

  if (
    normalized.includes("confidence") ||
    normalized.includes("presence")
  ) {
    return "confidence_presence";
  }

  if (
    ALLOWED_DIMENSION_KEYS.includes(normalized as AllowedDimensionKey)
  ) {
    return normalized as AllowedDimensionKey;
  }

  return "clarity_communication";
}

function defaultLabelForKey(key: AllowedDimensionKey): string {
  switch (key) {
    case "clarity_communication":
      return "Clarity & Communication";
    case "role_relevance":
      return "Role Relevance";
    case "technical_or_leadership_depth":
      return "Technical or Leadership Depth";
    case "problem_solving_examples":
      return "Problem Solving Examples";
    case "structure_conciseness":
      return "Structure & Conciseness";
    case "confidence_presence":
      return "Confidence & Presence";
  }
}

function normalizeDimension(d: unknown): {
  key: AllowedDimensionKey;
  label: string;
  score: number;
  reason: string;
} {
  const value = (d ?? {}) as {
    key?: unknown;
    label?: unknown;
    score?: unknown;
    reason?: unknown;
    name?: unknown;
    comment?: unknown;
  };

  const key = inferDimensionKey(value);

  const label =
    typeof value.label === "string" && value.label.trim()
      ? value.label
      : typeof value.name === "string" && value.name.trim()
        ? value.name
        : defaultLabelForKey(key);

  const score =
    typeof value.score === "number"
      ? Math.max(0, Math.min(100, Math.round(value.score)))
      : 0;

  const reason =
    typeof value.reason === "string" && value.reason.trim()
      ? value.reason
      : typeof value.comment === "string" && value.comment.trim()
        ? value.comment
        : "";

  return {
    key,
    label,
    score,
    reason,
  };
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const canUseInterview = await hasFeatureAccess(user.id, "interviewPractice");
  if (!canUseInterview) {
    return NextResponse.json(
      {
        detail: "Interview practice is available on Pro and Business plans.",
      },
      { status: 403 },
    );
  }

  let body: {
    interviewer?: "alex" | "sophia";
    resume_id?: string | null;
    transcript?: Array<{ role: "user" | "agent"; text: string }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const interviewer = body.interviewer ?? "alex";
  const transcript = Array.isArray(body.transcript) ? body.transcript : [];

  if (transcript.length < 2) {
    return NextResponse.json(
      {
        detail:
          "Not enough conversation to score yet. Try one full answer and end again.",
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
            "You are a precise interview scoring assistant. Return valid JSON only.",
        },
        {
          role: "user",
          content: buildPrompt({ interviewer, transcript }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<InterviewScoreResult> & {
      dimensions?: unknown[];
      evidence_quotes?: string[];
    };

    const result: InterviewScoreResult = {
      overall_score:
        typeof parsed.overall_score === "number"
          ? Math.max(0, Math.min(100, Math.round(parsed.overall_score)))
          : 0,
      confidence:
        parsed.confidence === "low" ||
        parsed.confidence === "medium" ||
        parsed.confidence === "high"
          ? parsed.confidence
          : "low",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
        : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      dimensions: Array.isArray(parsed.dimensions)
        ? parsed.dimensions.map(normalizeDimension)
        : [],
      evidence_quotes: Array.isArray(parsed.evidence_quotes)
        ? parsed.evidence_quotes
        : [],
    };

    return NextResponse.json({ score: result });
  } catch (error) {
    console.error("Interview scoring failed:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Interview scoring failed",
      },
      { status: 500 },
    );
  }
}