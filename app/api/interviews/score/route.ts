import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";
import { getAuthenticatedUser, getResume, insertInterviewSession } from "@/lib/services/db";
import type { InterviewScoreResult, InterviewTranscriptLine } from "@/lib/types";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

function clampScore(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, 5);
  return items.length > 0 ? items : fallback;
}

function normalizeScore(raw: any): InterviewScoreResult {
  const rawDims = Array.isArray(raw?.dimensions) ? raw.dimensions : [];
  const dimensions = rawDims
    .filter((d: any) => d && typeof d === "object")
    .map((d: any) => ({
      key: String(d.key ?? "clarity_communication") as InterviewScoreResult["dimensions"][number]["key"],
      label: typeof d.label === "string" ? d.label : "Dimension",
      score: clampScore(d.score, 0, 10),
      reason: typeof d.reason === "string" ? d.reason : "No reason provided.",
    }))
    .slice(0, 6);

  const overall = clampScore(raw?.overall_score, 0, 100);
  return {
    overall_score: overall,
    dimensions,
    strengths: asStringArray(raw?.strengths, ["Clear response structure", "Good role relevance"]),
    improvements: asStringArray(raw?.improvements, ["Use more specific examples", "Quantify outcomes"]),
    evidence_quotes: asStringArray(raw?.evidence_quotes, ["No quote captured"]),
    summary:
      typeof raw?.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : "Solid practice session with clear room for more concrete, metric-backed examples.",
    confidence:
      raw?.confidence === "low" || raw?.confidence === "medium" || raw?.confidence === "high"
        ? raw.confidence
        : "medium",
  };
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  if (!allowRateLimit(user.id, "llm")) return rateLimitedResponse(60);

  const body = (await req.json().catch(() => null)) as {
    interviewer?: "alex" | "sophia";
    resume_id?: string | null;
    transcript?: InterviewTranscriptLine[];
  } | null;

  const interviewer = body?.interviewer === "sophia" ? "sophia" : "alex";
  const transcript = (body?.transcript ?? []).filter(
    (t): t is InterviewTranscriptLine =>
      !!t &&
      (t.role === "user" || t.role === "agent") &&
      typeof t.text === "string" &&
      t.text.trim().length > 0,
  );

  if (transcript.length < 2) {
    return NextResponse.json({ detail: "Not enough transcript data to score." }, { status: 400 });
  }
  const shortTranscript = transcript.length < 6;

  const resume = body?.resume_id ? await getResume(body.resume_id, user.id) : null;
  const profileSummary = resume?.parsed_profile
    ? JSON.stringify(resume.parsed_profile).slice(0, 3000)
    : "No parsed profile available.";

  const transcriptBlock = transcript
    .map((line, idx) => `${idx + 1}. ${line.role === "user" ? "Candidate" : "Interviewer"}: ${line.text}`)
    .join("\n");

  const prompt = `
Score this mock interview for role readiness.

Interviewer style: ${interviewer}
Candidate profile summary:
${profileSummary}

Transcript:
${transcriptBlock}

Return JSON only with shape:
{
  "overall_score": 0-100,
  "dimensions": [
    {"key":"clarity_communication","label":"Clarity & Communication","score":0-10,"reason":"..."},
    {"key":"role_relevance","label":"Role Relevance","score":0-10,"reason":"..."},
    {"key":"technical_or_leadership_depth","label":"Technical or Leadership Depth","score":0-10,"reason":"..."},
    {"key":"problem_solving_examples","label":"Problem Solving Examples","score":0-10,"reason":"..."},
    {"key":"structure_conciseness","label":"Structure & Conciseness","score":0-10,"reason":"..."},
    {"key":"confidence_presence","label":"Confidence & Presence","score":0-10,"reason":"..."}
  ],
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "evidence_quotes": ["short quote 1", "short quote 2", "short quote 3"],
  "summary": "2-3 sentence summary",
  "confidence": "low|medium|high"
}

Rules:
- Base feedback on transcript evidence only.
- Keep reasons concise and actionable.
- If interviewer is alex, weigh technical depth more; if sophia, weigh leadership/collaboration depth more.
- If transcript is short (few turns), set confidence to "low" and mention that the sample is limited.
`.trim();

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are an interview coach. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  const score = normalizeScore(parsed);
  if (shortTranscript && score.confidence !== "low") {
    score.confidence = "low";
  }

  const session = await insertInterviewSession({
    userId: user.id,
    resumeId: body?.resume_id ?? null,
    interviewer,
    transcript,
    score,
  });

  return NextResponse.json({ session_id: session.id, score: session.score });
}

