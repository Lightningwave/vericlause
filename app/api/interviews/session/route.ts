import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getResume, listResumes } from "@/lib/services/db";
import { hasFeatureAccess } from "@/lib/billing/access";
import { extractJobFromUrl } from "@/lib/services/jobRecommendation";
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
  jobContext?: string | null;
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
      ? "Easy: questions should be friendly and accessible; avoid heavy jargon; focus on clarity and confidence-building. Where it helps, weave in a brief illustrative angle or one short example clause (clearly framed as an example) so the candidate knows the shape of a strong answer—do not write a full scripted response."
      : difficulty === "hard"
        ? "Hard: questions should be more probing; require specifics, trade-offs, and metrics; include at least 1 challenging scenario; keep it fair and relevant to the resume."
        : "Medium: balanced difficulty; ask for concrete examples and some detail without being overly intense.";

  const prompt = `
You are an expert interviewer generating high-fidelity practice questions.

### Context
Candidate Resume: ${profileJson}
Target Role: ${targetRole || "not specified"}
Job Description/Context: ${params.jobContext || "not specified"}

### Interviewer Persona
- **Name**: ${persona.name}
- **Style**: ${persona.style}
- **Goal**: ${
      params.interviewer === "alex"
        ? "Alex wants proof of technical/operational ownership: tools, metrics, 'The How', and trade-offs."
        : "Sophia wants proof of leadership, strategic influence, 'The Why', and conflict resolution."
    }

### Instructions
1. **Gap Analysis**:
   - **If Job Context is provided**: Compare Job Context to Resume. Identify 3 "Must-Wins" (matches) and 1 "Gap" (a skill/requirement in JD that is missing/weak in Resume).
   - **If Job Context is NOT provided**: Focus on the 4 most impressive/high-impact details from the Candidate Resume related to their Target Role.
2. **Generate exactly 5 questions** following this sequence:
   - **Q1 (Role-Fit/Intro)**: A professional intro tailored to the target role.
   - **Q2 (Experience Deep-Dive)**: Probe a high-signal achievement from the resume that matches a JD "Must-Win" (if context provided) or is a top-tier accomplishment (if no context).
   - **Q3 (JD Gap Inquiry)**:
     - **If context provided**: Probe the identified "Gap". Ask how they would handle that specific JD requirement.
     - **If NO context**: Ask a challenging follow-up on their most senior experience or a related higher-level responsibility.
   - **Q4 (Behavioural - STAR)**: A scenario question (Conflict, Feedback, Prioritization) that requires a **STAR** (Situation-Task-Action-Result) response.
   - **Q5 (Scenario/Trade-off)**: A realistic operational scenario for this target role. **Alex** asks about technical/execution trade-offs; **Sophia** asks about stakeholder/strategic trade-offs.

### Constraints
- Difficulty: ${difficulty} — ${difficultyGuidance}
- Each question must be 1–2 sentences.
- Grounded in facts; never invent employers or titles.
- DO NOT mention "JSON", "parsed profile", or "resume".

Output ONLY a JSON array of 5 strings.
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

async function generatePracticeGuide(params: {
  interviewer: "alex" | "sophia";
  difficulty: "easy" | "medium";
  parsedProfile: Record<string, unknown>;
  targetRole: string | null;
  jobContext?: string | null;
  seedQuestions: string[];
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const personaName = params.interviewer === "sophia" ? "Sophia" : "Alex";
  const personaStyle =
    params.interviewer === "sophia"
      ? "executive recruiter; behavioural STAR questions; leadership, collaboration, motivation, cultural fit"
      : "hiring manager; execution, tools, metrics, scope, problem-solving, ownership";

  const difficultyNote =
    params.difficulty === "easy"
      ? "Easy: warm, supportive, confidence-building; no intimidation; simple language. Besides guidance, include clearly labeled example phrases, sentence starters, or tiny STAR-style micro-outlines the candidate can adapt—grounded only in facts from the profile; never invent employers, titles, or achievements."
      : "Medium: still fair and professional, but expect more detail, specifics, and light pressure—the live questions will feel harder than Easy.";

  const seeds =
    params.seedQuestions.length > 0
      ? params.seedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")
      : "(none — host will improvise from profile)";

  const profileJson = JSON.stringify(params.parsedProfile);

  const prompt = `
You are a world-class interview coach writing a practice prep guide for a 5-minute voice session.

Context
- Interviewer: ${personaName} (${personaStyle})
- Difficulty: ${params.difficulty}
- Target role: ${params.targetRole ?? "General"}
- Job context: ${params.jobContext ?? "Not specified"}

Seed questions (Q1–Q5, in order):
${seeds}

Candidate profile (JSON — use facts only):
${profileJson}

Content rules
1. Hidden goals: For each seed Q1–Q5, name what the interviewer is really evaluating (one clear sentence per question).
2. STAR: For Q4 only, give a four-part skeleton labeled exactly on separate lines: Situation: / Task: / Action: / Result: — each followed by one short sentence grounded in their real experience (no invented employers or metrics).
3. Alignment: If job context exists, give one concrete bridge from resume to JD. If not, lead with their strongest differentiator and how to stress it in answers.
4. Tone: direct, plain English, empowering. No jargon about “JSON” or “parsed profile”.

CRITICAL FORMAT (the app parses this mechanically — violations break the UI)
- Use ONLY these section headers, each on its own line, exactly starting with two hash marks and a space:
## Why this session matters
## What ${personaName} is really testing (per question)
## STAR skeleton for Q4
## How to position your story
## Final checklist
- Do not use **asterisk bold**, # headings, or markdown tables anywhere.
- In "What ${personaName} is really testing", use a numbered list: lines must start with "1. ", "2. ", … "5. " then plain text (no bold).
- In "Final checklist" put ONLY 3–5 items, one per line, each starting with a hyphen and space: "- " then short imperative text (no checkmarks, no bold, no duplicate labels).

Length: about 350–500 words total.
`.trim();

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.45,
      max_tokens: 1200,
    });
    const guide = result.choices[0]?.message?.content?.trim();
    return guide || null;
  } catch (e) {
    console.error("generatePracticeGuide:", e);
    return null;
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
  const requestedJobUrl = searchParams.get("job_url");
  const requestedJobDescription = searchParams.get("job_description");

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

  // Scrape Job URL if provided
  let scrapedJobDescription: string | null = null;
  let scrapedJobTitle: string | null = null;
  let scrapedCompany: string | null = null;

  if (requestedJobUrl) {
    try {
      const scraped = await extractJobFromUrl(requestedJobUrl);
      scrapedJobDescription = scraped.description || null;
      scrapedJobTitle = scraped.title || null;
      scrapedCompany = scraped.company || null;
    } catch (err) {
      console.error("Interview session scrape error:", err);
    }
  }

  const jobContext = [
    scrapedJobTitle ? `Role Title: ${scrapedJobTitle}` : null,
    scrapedCompany ? `Company: ${scrapedCompany}` : null,
    requestedJobDescription || scrapedJobDescription ? `Job Description: ${requestedJobDescription || scrapedJobDescription}` : null,
  ].filter(Boolean).join("\n");

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
      : scrapedJobTitle || (parsedProfile.target_roles as unknown as string[] | undefined)?.[0]) ??
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
    jobContext,
    difficulty,
  });

  const practiceGuide =
    difficulty === "easy" || difficulty === "medium"
      ? await generatePracticeGuide({
          interviewer: interviewerId === "sophia" ? "sophia" : "alex",
          difficulty,
          parsedProfile,
          targetRole: effectiveTargetRole,
          jobContext,
          seedQuestions: personaQuestions,
        })
      : null;

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

# Job Context
${jobContext || "None provided"}
${seedQuestionsText}
  `.trim();

  const headlineHint =
    safeString(parsedProfile.headline) ?? effectiveTargetRole ?? "your background";

  const firstMessage =
    interviewerId === "sophia"
      ? `Hi — I'm ${interviewer.name}. I’ve had a chance to look at your background around ${headlineHint}. Whenever you’re ready, tell me a bit about yourself and what you’re aiming for next.`
      : `Hi — I'm ${interviewer.name}. I’ve skimmed your profile around ${headlineHint}; we’ll keep this efficient. When you’re ready, give me a quick intro and what role you’re targeting.`;

  return NextResponse.json({
    agent_id: agentId,
    dynamic_instructions: dynamicInstructions,
    first_message: firstMessage,
    practice_guide: practiceGuide,
    job_metadata: {
      title: scrapedJobTitle,
      company: scrapedCompany,
    },
  });
}