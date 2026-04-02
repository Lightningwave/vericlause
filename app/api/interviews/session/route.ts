import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, listResumes } from "@/lib/services/db";
import { getContractAnalysisLimit, hasFeatureAccess } from "@/lib/billing/access";
import { buildUsageLimitMessage, isWithinUsageLimit } from "@/lib/billing/usage";


const INTERVIEWERS = {
  alex: {
    name: "Alex",
    role: "Hiring Manager",
    style:
      "Direct, practical, and focused on technical expertise, delivery, and problem-solving.",
  },
  sophia: {
    name: "Sophia",
    role: "Senior Executive Recruiter",
    style:
      "Warm, strategic, and focused on leadership, collaboration, motivation, and behavioural questions.",
  },
} as const;

function buildResumeContext(resume: {
  raw_text?: string | null;
  parsed_profile?: Record<string, unknown> | null;
}) {
  const rawText = resume.raw_text?.trim() || "";
  const parsedProfile = resume.parsed_profile
    ? JSON.stringify(resume.parsed_profile, null, 2)
    : "";

  return `
Resume raw text:
${rawText || "Not available"}

Parsed profile:
${parsedProfile || "Not available"}
`.trim();
}

export async function GET(req: NextRequest) {
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

  const contractLimit = await getContractAnalysisLimit(user.id);
  const usage = await isWithinUsageLimit({
    userId: user.id,
    kind: "contract_full_analysis",
    window: contractLimit.window,
    limit: contractLimit.limit,
  });

  if (!usage.allowed) {
    return NextResponse.json(
      {
        detail: buildUsageLimitMessage({
          kind: "contract_full_analysis",
          window: contractLimit.window,
          limit: contractLimit.limit,
        }),
        code: "contract_analysis_limit_reached",
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit,
        window: contractLimit.window,
      },
      { status: 403 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      {
        detail:
          "ElevenLabs API key or Agent ID is missing from environment variables.",
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const interviewerId =
    (searchParams.get("interviewer") as keyof typeof INTERVIEWERS | null) ??
    "alex";
  const requestedResumeId = searchParams.get("resume_id");

  const interviewer = INTERVIEWERS[interviewerId] ?? INTERVIEWERS.alex;

  const resumes = await listResumes(user.id);
  const resume =
    (requestedResumeId
      ? resumes.find((r) => r.id === requestedResumeId)
      : null) ??
    resumes[0] ??
    null;

  if (!resume) {
    return NextResponse.json(
      {
        detail:
          "No resume found. Please upload or create a resume before starting interview practice.",
      },
      { status: 400 },
    );
  }

  const resumeContext = buildResumeContext({
    raw_text: resume.raw_text,
    parsed_profile: resume.parsed_profile as Record<string, unknown> | null,
  });

  const dynamicInstructions = `
You are ${interviewer.name}, a ${interviewer.role}.

Interview style:
${interviewer.style}

You are conducting a short interview practice session for the user.
Use the user's resume as context.
Ask one question at a time.
Keep questions concise and realistic.
Do not answer for the user.
Do not produce long monologues.
Do not mention that you are AI unless directly asked.
Keep the tone professional and supportive.

${resumeContext}
`.trim();

  const firstMessage = `Hi, I'm ${interviewer.name}. Let's begin. Could you briefly introduce yourself?`;

  return NextResponse.json({
    agent_id: agentId,
    dynamic_instructions: dynamicInstructions,
    first_message: firstMessage,
  });
}