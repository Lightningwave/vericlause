import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, listResumes, getResume } from "@/lib/services/db";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Helpers — build a rich candidate context and seed questions from the resume
// ---------------------------------------------------------------------------

interface ParsedProfile {
    headline?: string | null;
    summary?: string | null;
    skills?: string[];
    years_experience?: number | null;
    seniority_level?: string | null;
    target_roles?: string[];
    target_industries?: string[];
    location_preference?: string | null;
    experiences?: {
        title?: string | null;
        company?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        description?: string | null;
    }[];
    education?: {
        institution?: string | null;
        qualification?: string | null;
        field_of_study?: string | null;
        graduation_year?: number | null;
    }[];
}

function buildCandidateContext(fileName: string | null, profile: ParsedProfile): string {
    const lines: string[] = [
        `Name: ${fileName?.replace(/\.[^/.]+$/, "") || "Candidate"}`,
        `Headline: ${profile.headline || "N/A"}`,
        `Summary: ${profile.summary || "N/A"}`,
        `Seniority Level: ${profile.seniority_level || "N/A"}`,
        `Years of Experience: ${profile.years_experience ?? "N/A"}`,
        `Target Roles: ${profile.target_roles?.join(", ") || "N/A"}`,
        `Target Industries: ${profile.target_industries?.join(", ") || "N/A"}`,
        `Location: ${profile.location_preference || "N/A"}`,
        `Skills: ${profile.skills?.join(", ") || "N/A"}`,
        ``,
        `Education:`,
        ...(profile.education || []).map(
            (edu) =>
                `- ${edu.qualification || "Degree"}${edu.field_of_study ? ` in ${edu.field_of_study}` : ""} from ${edu.institution || "Unknown"} (${edu.graduation_year ?? "N/A"})`,
        ),
        ``,
        `Experience:`,
        ...(profile.experiences || []).map(
            (exp) =>
                `- ${exp.title || "Role"} at ${exp.company || "Company"} (${exp.start_date || "?"} - ${exp.end_date || "Present"}): ${exp.description || "N/A"}`,
        ),
    ];
    return lines.join("\n");
}

function seniorityTier(profile: ParsedProfile): "executive" | "mid" | "junior" {
    const level = (profile.seniority_level || "").toLowerCase();
    if (["executive", "senior", "lead"].includes(level)) return "executive";
    if (["mid"].includes(level)) return "mid";
    const years = profile.years_experience ?? 0;
    if (years >= 10) return "executive";
    if (years >= 4) return "mid";
    return "junior";
}

/**
 * Use OpenAI to generate resume-specific seed questions.
 * Alex gets skills/technical depth; Sophia gets behavioral/leadership.
 * Falls back to generic questions if the API call fails.
 */
async function generateSeedQuestions(
    context: string,
    profile: ParsedProfile,
    interviewer: "alex" | "sophia",
): Promise<string[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("[SeedQuestions] No OPENAI_API_KEY, using fallback questions.");
        return getFallbackQuestions(profile, interviewer);
    }

    const tier = seniorityTier(profile);
    const skills = profile.skills || [];

    const alexPrompt = `You are preparing interview questions for a hiring manager named Alex who focuses on technical skills, tools, and execution.

Candidate Profile:
${context}

Generate exactly 6 interview questions that:
1. **Probe specific skills listed on the resume** — for each technical skill or programming language (${skills.slice(0, 8).join(", ")}), ask the candidate to demonstrate understanding. For programming languages, ask about concepts, design patterns, or architecture decisions. For tools, ask about real usage and impact.
2. **Drill into quantifiable achievements** — reference specific numbers, metrics, or outcomes from their experience and ask them to explain the process.
3. **Test problem-solving** — ask about challenges, constraints, and how they debugged issues.
4. **Match seniority level** — this is a ${tier}-level candidate with ${profile.years_experience ?? "unknown"} years of experience. Calibrate question depth accordingly.

Rules:
- Each question should reference something SPECIFIC from their resume (a skill, company, achievement, or tool).
- For programming skills, ask conceptual questions (e.g., "explain closures", "when would you use X pattern", "how would you architect Y").
- Keep questions conversational — these will be asked in a live voice interview.
- One question per line, no numbering or bullets.
- Return ONLY the 6 questions, nothing else.`;

    const sophiaPrompt = `You are preparing interview questions for an executive recruiter named Sophia who focuses on leadership, collaboration, motivation, and cultural fit.

Candidate Profile:
${context}

Generate exactly 6 interview questions that:
1. **Explore leadership and team-building** — reference specific team sizes, management experiences, or growth stories from their resume.
2. **Probe career transitions** — ask about motivations for role changes and what they were seeking.
3. **Test stakeholder management** — ask about influencing senior leaders, navigating disagreements, or cross-functional collaboration.
4. **Assess cultural fit and motivation** — explore why they want their target role (${profile.target_roles?.join(", ") || "their next role"}) and what kind of environment they thrive in.
5. **Match seniority level** — this is a ${tier}-level candidate with ${profile.years_experience ?? "unknown"} years of experience. Calibrate accordingly.

Rules:
- Each question should reference something SPECIFIC from their resume (a role, company, team, or career milestone).
- Keep questions conversational — these will be asked in a live voice interview.
- One question per line, no numbering or bullets.
- Return ONLY the 6 questions, nothing else.`;

    try {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.7,
            max_tokens: 1024,
            messages: [
                {
                    role: "system",
                    content: "You generate targeted interview questions based on candidate resumes. Return only the questions, one per line.",
                },
                {
                    role: "user",
                    content: interviewer === "alex" ? alexPrompt : sophiaPrompt,
                },
            ],
        });

        const raw = response.choices[0]?.message?.content ?? "";
        const questions = raw
            .split("\n")
            .map((line) => line.replace(/^\d+[\.\)\-]\s*/, "").replace(/^"|"$/g, "").trim())
            .filter((line) => line.length > 10 && line.endsWith("?"));

        if (questions.length >= 3) {
            console.log(`[SeedQuestions] Generated ${questions.length} questions via OpenAI for ${interviewer}.`);
            return questions.slice(0, 6);
        }

        console.warn("[SeedQuestions] OpenAI returned too few questions, using fallback.");
        return getFallbackQuestions(profile, interviewer);
    } catch (err) {
        console.error("[SeedQuestions] OpenAI call failed, using fallback:", err);
        return getFallbackQuestions(profile, interviewer);
    }
}

/** Basic fallback questions if OpenAI is unavailable */
function getFallbackQuestions(profile: ParsedProfile, interviewer: "alex" | "sophia"): string[] {
    const skills = profile.skills || [];
    const latest = (profile.experiences || [])[0];

    if (interviewer === "alex") {
        return [
            skills.length > 0
                ? `You list ${skills.slice(0, 3).join(", ")} as key skills. Pick the one you're strongest in and walk me through a real scenario where it made a measurable difference.`
                : "What technical skill are you most confident in, and how have you applied it?",
            latest
                ? `At ${latest.company || "your current company"}, what's the most technically challenging problem you solved?`
                : "Tell me about a complex technical challenge you've faced.",
            "Describe a time when a project didn't go as planned. How did you debug the situation?",
        ];
    }
    return [
        "Tell me about your leadership style and how it's evolved over your career.",
        "What drove your most recent career move, and what were you looking for?",
        "Describe the kind of team culture where you do your best work.",
    ];
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
    const user = await getAuthenticatedUser();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resumeId = searchParams.get("resume_id");
    const interviewer = searchParams.get("interviewer") || "alex";

    let resume;
    if (resumeId) {
        resume = await getResume(resumeId, user.id);
    } else {
        const resumes = await listResumes(user.id);
        resume = resumes[0]; // Latest
    }

    if (!resume) {
        return NextResponse.json({ detail: "No resume found. Please upload a resume first." }, { status: 404 });
    }

    const profile = resume.parsed_profile as ParsedProfile | null;
    if (!profile) {
        return NextResponse.json({ detail: "Resume is not yet profiled. Please wait for profiling to complete." }, { status: 400 });
    }

    // Build enriched context with ALL resume data
    const context = buildCandidateContext(resume.file_name, profile);

    // Generate resume-specific seed questions via OpenAI
    const isSophia = interviewer.toLowerCase() === "sophia";
    const seedQuestions = await generateSeedQuestions(context, profile, isSophia ? "sophia" : "alex");
    const seedQuestionsBlock = seedQuestions
        .map((q, i) => `  ${i + 1}. "${q}"`)
        .join("\n");

    const tier = seniorityTier(profile);

    const sophiaAgentId = process.env.ELEVENLABS_SOPHIA_AGENT_ID?.trim();

    if (isSophia && !sophiaAgentId) {
        console.error("Missing ELEVENLABS_SOPHIA_AGENT_ID for Sophia interviewer.");
        return NextResponse.json(
            {
                detail:
                    "Sophia interviewer is not configured. Set ELEVENLABS_SOPHIA_AGENT_ID in your environment (same as in .env.local for local dev).",
            },
            { status: 500 },
        );
    }

    /** Optional TTS override; Sophia's agent usually uses the voice configured in ElevenLabs for that agent. */
    const defaultSophiaVoiceId = "SDNKIYEpTz0h56jQX8rA";
    const sophiaVoiceId = process.env.ELEVENLABS_SOPHIA_VOICE_ID ?? defaultSophiaVoiceId;
    const useVoiceOverride = isSophia && !!process.env.ELEVENLABS_SOPHIA_VOICE_ID;

    const persona = isSophia ? {
        name: "Sophia",
        role: "Senior Executive Recruiter & Career Strategist",
        personality: [
            "Warm, poised, and highly professional — you sound like a trusted advisor, not an interrogator.",
            "You care deeply about how candidates lead, collaborate, and grow: leadership presence, influence without authority, stakeholder communication, and resilience.",
            "You probe cultural fit and motivation: why this role, why now, and how they would show up for a team in Singapore's fast-moving hiring landscape.",
            "You listen for specifics: stories with context, trade-offs they made, and what they learned — not buzzwords.",
            "You speak with a refined, encouraging tone; you give brief, genuine acknowledgement before moving to the next question.",
        ].join(" "),
        voiceId: sophiaVoiceId,
        agentId: sophiaAgentId!,
    } : {
        name: "Alex",
        role: "Seasoned Hiring Manager",
        personality: "Direct, practical, and fair. You focus on technical skills, problem-solving abilities, and concrete results. You value brisk, data-driven answers.",
        voiceId: undefined,
        agentId: process.env.ELEVENLABS_AGENT_ID
    };

    // Seniority-aware interview style adjustments
    const seniorityGuidance = tier === "executive"
        ? `This is a **senior/executive-level** candidate (${profile.years_experience ?? "many"} years). Focus on strategic thinking, vision-setting, stakeholder influence, and how they've shaped outcomes at scale. Expect sophisticated, nuanced answers.`
        : tier === "mid"
            ? `This is a **mid-level** candidate. Balance execution-depth with growing leadership responsibility. Probe both hands-on delivery and team collaboration.`
            : `This is an **early-career** candidate. Focus on learning agility, foundational skills, eagerness to grow, and how they've contributed within teams. Keep the tone encouraging.`;

    const interviewStyleExtra = isSophia
        ? `
## Interview style — Sophia (executive recruiter)
- **Focus**: Leadership stories, collaboration, stakeholder influence, motivation, and cultural fit. Avoid deep stack trivia unless it clearly matches their target role.
- **Seniority calibration**: ${seniorityGuidance}
- **Opening energy**: Confident and welcoming; show you've read their profile (headline, key experiences).
- **Question style**: Behavioural and situational ("Tell me about a time…", "How did you navigate…") grounded in their CV.
- **Follow-ups**: At most one per question — ask for concrete context (trade-offs, who was involved, what changed) when answers stay generic.
- **Avoid**: Sounding robotic or cold; inventing employers, titles, or skills.
- **Tone**: Refined, encouraging, calm pacing; short sentences. Singapore: professional warmth with clarity.
`
        : `
## Interview style — Alex (hiring manager)
- **Focus**: Technical depth, skills mastery, execution proof, and problem-solving. **Prioritize questions about their listed skills** — probe how they actually use them, in what context, and to what effect. Tie questions directly to skills, tools, and experience bullets from their resume.
- **Seniority calibration**: ${seniorityGuidance}
- **Skills deep-dive**: For each skill they list, you should be ready to ask "how", "when", and "what impact". Don't accept surface-level answers like "I'm proficient in X" — ask for the specific project, the challenge, and the measurable result.
- **Opening energy**: Direct and respectful of time; signal you care about substance.
- **Question style**: Lean technical or operational ("Walk me through…", "What was the hardest part…", "How did you measure success…"). Ask for metrics, timeline, ownership, validation.
- **Follow-ups**: At most one per question — clarify what *they* did vs the team, and how they'd adapt next time.
- **Avoid**: Hostile tone; purely motivational fluff without linking to delivery; inventing facts about the candidate.
- **Tone**: Brisk, clear, minimal filler. Singapore: competence and clarity expected.
`;

    const instructions = `
# Identity & Persona
- **Name**: ${persona.name}
- **Role**: ${persona.role}
- **Personality**: ${persona.personality}
${interviewStyleExtra}

# Sound human (not scripted)
- You are in a **live conversation**, not reading a checklist. Vary your wording; do not repeat the same filler every turn.
- Use **short bridges** between topics: a genuine one-liner reaction ("That's helpful context," "Got it — thanks for clarifying") before the next question.
- **One question at a time.** Let them finish; then respond, then ask. If they go long, you may gently narrow ("To keep us on track — in one or two sentences, what was the outcome?").
- If they seem nervous, **one calming line** is fine; then move on. Avoid sounding rushed or like a form.
- If they start talking over you, **stop immediately** and yield the floor.

# Seed Questions (pick your 3 from this pool — adapt wording to feel natural)
These are pre-generated based on the candidate's resume. Choose 3 that best assess their readiness for their target role. You may rephrase them to sound conversational, but keep the intent:
${seedQuestionsBlock}

You are NOT limited to these — if the conversation naturally goes somewhere relevant, follow it. But use these as your starting framework.

# Structure (hidden agenda — keep it light on the surface)
- Cover **exactly three main question topics** across the session, drawn from the seed questions above. Do **not** label them "Question 1/2/3" out loud.
- You may use **one short follow-up** per topic when something is vague — same topic only, then move on.
- Aim for a **short practice session** (roughly a few minutes of dialogue). Prefer **brief turns**: your spoken replies usually **well under ~30 seconds** so they get air time.
- If time is running short, **skip depth** and offer a warm, quick close instead of squeezing another topic.
- If they go quiet after you ask something, **one gentle nudge** ("Take your time — whenever you're ready") before rephrasing more simply.

# Candidate Profile
${context}

# Flow (guide, don't robot-read)
1. **Opening**: Greet them by name if it appears naturally from the profile; mention you've looked at their background (${profile.headline || "their experience"}) in your own words — don't quote blocks from the CV. Invite them to begin when ready (they can say "start", "ready", or equivalent — accept natural cues).
2. **Middle**: Explore three topics as a **flowing interview**: acknowledge what they said, then **build** ("Building on that…", "I'm curious about…", "One more angle…"). Avoid robotic pivots like "Next question:".
3. **Close**: When you've fairly covered three topics (or time is tight), transition naturally ("Before we wrap…", "Last thing from me…"). Share **one** strength and **one** concrete improvement idea in plain language, then thank them and wish them well. Don't list bullets aloud.

# Guardrails
- **Do not invent** employers, titles, skills, or achievements not supported by the profile.
- Stay within **Interview style** for this persona (Sophia vs Alex).
    `.trim();

    const headlineHint = profile.headline || "your experience";
    const firstMessage = isSophia
        ? `Hi — I'm ${persona.name}. I've had a chance to look at your background around ${headlineHint}, and I'm glad we could make this work. Whenever you're ready, we can get started — just let me know.`
        : `Hi — I'm ${persona.name}. I've skimmed your profile around ${headlineHint}; we'll keep this efficient. Whenever you're ready to begin, just say the word.`;

    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) {
        console.error("Missing ElevenLabs Configuration in environment variables.");
        return NextResponse.json({ detail: "ElevenLabs API Key or Agent ID is missing from environment variables." }, { status: 500 });
    }

    return NextResponse.json({
        agent_id: persona.agentId,
        dynamic_instructions: instructions,
        first_message: firstMessage,
        voice_id: isSophia ? persona.voiceId : undefined,
        use_voice_override: useVoiceOverride,
    });
}
