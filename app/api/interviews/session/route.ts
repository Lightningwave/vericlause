import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getResume, listResumes } from "@/lib/services/db";
import { hasFeatureAccess } from "@/lib/billing/access";
import OpenAI from "openai";


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

function safeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function buildProfileContext(params: {
  fileName?: string | null;
  parsedProfile: Record<string, unknown>;
}): string {
  const { parsedProfile } = params;
  const nameFromFile =
    params.fileName?.replace(/\.[^/.]+$/, "").trim() || "Candidate";

  const headline = safeString(parsedProfile.headline) ?? "N/A";
  const summary = safeString(parsedProfile.summary) ?? "N/A";
  const skills = asStringArray(parsedProfile.skills);
  const experiences = Array.isArray(parsedProfile.experiences)
    ? (parsedProfile.experiences as Array<Record<string, unknown>>)
    : [];

  const experienceLines = experiences.map((exp) => {
    const title = safeString(exp.title) ?? "Role";
    const company = safeString(exp.company) ?? "Company";
    const start = safeString(exp.start_date) ?? "";
    const end = safeString(exp.end_date) ?? "Present";
    const desc = safeString(exp.description) ?? "";
    const dates = [start, end].filter(Boolean).join(" - ");
    const header = `${title} at ${company}${dates ? ` (${dates})` : ""}`;
    return `- ${header}${desc ? `: ${desc}` : ""}`;
  });

  return [
    `Name: ${nameFromFile}`,
    `Headline: ${headline}`,
    `Summary: ${summary}`,
    `Skills: ${skills.length ? skills.join(", ") : "N/A"}`,
    `Experience:`,
    ...(experienceLines.length ? experienceLines : ["- N/A"]),
  ].join("\n");
}

async function generateSeedQuestions(params: {
  interviewer: "alex" | "sophia";
  parsedProfile: Record<string, unknown>;
  targetRole?: string | null;
  difficulty: "easy" | "medium" | "hard";
}): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const openai = new OpenAI({ apiKey });

  const targetRole = params.targetRole?.trim() || "";
  const profileJson = JSON.stringify(params.parsedProfile);
  const difficulty = params.difficulty;

  const persona =
    params.interviewer === "sophia"
      ? {
          name: "Sophia",
          style:
            "Executive recruiter: warm, polished, behavioural/situational questions; leadership, collaboration, motivation; one follow-up max.",
        }
      : {
          name: "Alex",
          style:
            "Hiring manager: direct, execution-focused; technical/operational questions; ask for scope, tools, metrics, ownership; one follow-up max.",
        };

  const difficultyGuidance =
    difficulty === "easy"
      ? "Easy: questions should be friendly and accessible; avoid heavy jargon; focus on clarity and confidence-building."
      : difficulty === "hard"
        ? "Hard: questions should be more probing; require specifics, trade-offs, and metrics; include at least 1 challenging scenario; keep it fair and relevant to the resume."
        : "Medium: balanced difficulty; ask for concrete examples and some detail without being overly intense.";

  const prompt = `
You are generating interview practice questions.

Interviewer persona:
- Name: ${persona.name}
- Style: ${persona.style}

Candidate parsed profile JSON:
${profileJson}

Target role (if provided): ${targetRole || "not specified"}
Difficulty: ${difficulty} — ${difficultyGuidance}

Write exactly 5 concise interview questions.
- Ground them in the candidate's skills/experience.
- Vary the question types (delivery/impact, problem-solving, collaboration/leadership/motivation depending on persona).
- Do not reference "JSON" or "parsed profile" in the questions.
- Output ONLY a JSON array of strings (no markdown, no extra keys).
`.trim();

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const content = result.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) return [];
    const questions = parsed
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 5);
    return questions;
  } catch {
    return [];
  }
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

  const { searchParams } = new URL(req.url);
  const interviewerId =
    (searchParams.get("interviewer") as keyof typeof INTERVIEWERS | null) ??
    "alex";
  const requestedResumeId = searchParams.get("resume_id");
  const requestedTargetRole = searchParams.get("target_role");
  const requestedDifficulty = searchParams.get("difficulty");

  const interviewer = INTERVIEWERS[interviewerId] ?? INTERVIEWERS.alex;

  let resume = requestedResumeId
    ? await getResume(requestedResumeId, user.id)
    : null;
  if (!resume) {
    const resumes = await listResumes(user.id);
    resume = resumes[0] ?? null;
  }

  if (!resume) {
    return NextResponse.json(
      {
        detail:
          "No resume found. Please upload or create a resume before starting interview practice.",
      },
      { status: 404 },
    );
  }

  const parsedProfile = resume.parsed_profile as Record<string, unknown> | null;
  if (!parsedProfile) {
    return NextResponse.json(
      {
        detail:
          "Resume is not yet profiled. Please wait for profiling to complete.",
      },
      { status: 400 },
    );
  }

  const context = buildProfileContext({
    fileName: (resume.file_name as string | null) ?? null,
    parsedProfile,
  });

  const isSophia = interviewerId === "sophia";
  const sophiaAgentId = process.env.ELEVENLABS_SOPHIA_AGENT_ID?.trim();

  if (isSophia && !sophiaAgentId) {
    console.error("Missing ELEVENLABS_SOPHIA_AGENT_ID for Sophia interviewer.");
    return NextResponse.json(
      {
        detail:
          "Sophia interviewer is not configured. Set ELEVENLABS_SOPHIA_AGENT_ID in your environment.",
      },
      { status: 500 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = isSophia ? sophiaAgentId! : process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      {
        detail:
          "ElevenLabs API key or Agent ID is missing from environment variables.",
      },
      { status: 500 },
    );
  }

  const effectiveTargetRole =
    (requestedTargetRole && requestedTargetRole.trim().length > 0
      ? requestedTargetRole
      : (parsedProfile.target_roles as unknown as string[] | undefined)?.[0]) ??
    (safeString(parsedProfile.headline) ?? null);

  const difficulty: "easy" | "medium" | "hard" =
    requestedDifficulty === "easy" ||
    requestedDifficulty === "hard" ||
    requestedDifficulty === "medium"
      ? requestedDifficulty
      : "medium";

  const personaQuestions = await generateSeedQuestions({
    interviewer: (interviewerId === "sophia" ? "sophia" : "alex") as
      | "alex"
      | "sophia",
    parsedProfile,
    targetRole: effectiveTargetRole,
    difficulty,
  });

  const seedQuestionsText =
    personaQuestions.length > 0
      ? `\n\nSeed questions (ask in order):\n${personaQuestions
          .map((q, i) => `${i + 1}) ${q}`)
          .join("\n")}\n`
      : "";

  const personaBlock = isSophia
    ? `
## Interview style — Sophia (executive recruiter)
- Focus: leadership, collaboration, motivation, cultural fit.
- Question style: behavioural/situational (STAR). One follow-up max if vague.
- Tone: warm, encouraging, professional.
`
    : `
## Interview style — Alex (hiring manager)
- Focus: execution, problem-solving, proof (scope, tools, outcomes, constraints).
- Question style: technical/operational. Ask for metrics, ownership, trade-offs.
- Tone: brisk, clear, minimal filler.
`;

  const dynamicInstructions = `
# Identity
You are ${interviewer.name}, a ${interviewer.role}.
Personality: ${interviewer.style}

${personaBlock}

# Rules
- One question at a time.
- Keep questions concise and realistic.
- Target a ~5-minute practice session. Prefer short turns so the candidate speaks most of the time.
- Difficulty: ${difficulty}. Adjust how probing you are accordingly, but stay fair and grounded in the profile.
- Do not invent employers, titles, or achievements.
- Use the candidate profile below; ground questions in their skills and experiences.

# Candidate Profile
${context}

# Practice target role
${effectiveTargetRole ?? "null"}
${seedQuestionsText}
  `.trim();

  const firstQuestion =
    personaQuestions[0] ??
    `Could you briefly introduce yourself and your most relevant experience for ${
      effectiveTargetRole ?? "this role"
    }?`;

  const firstMessage = `Hi — I'm ${interviewer.name}. ${firstQuestion}`;

  return NextResponse.json({
    agent_id: agentId,
    dynamic_instructions: dynamicInstructions,
    first_message: firstMessage,
  });
}