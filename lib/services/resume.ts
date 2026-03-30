import OpenAI from "openai";
import type { ResumeProfile, ResumeSuggestion } from "@/lib/types";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }
  return new OpenAI({ apiKey });
}

const RESUME_PROFILE_MODEL = "gpt-4o";

const RESUME_PROFILE_PROMPT = `You are an expert career coach and technical recruiter with 15+ years of experience in Singapore's tech industry. You specialize in helping candidates optimize their resumes for specific roles and career advancement.

You will be given the FULL resume text. Extract the structured profile and provide actionable AI suggestions for improvement.

ANALYSIS FRAMEWORK:
1. ATS Optimization: Keyword density, formatting, section structure
2. Impact Quantification: Metrics, achievements, business impact  
3. Career Narrative: Storytelling, progression, gaps
4. Role Alignment: Skills matching, experience relevance
5. Market Positioning: Competitive differentiation

Return ONLY a JSON object with this shape:

{
  "profile": {
    "headline": string | null,
    "summary": string | null,
    "skills": string[],
    "years_experience": number | null,
    "experiences": [
      {
        "title": string | null,
        "company": string | null,
        "start_date": string | null,
        "end_date": string | null,
        "description": string | null
      }
    ],
    "education": [
      {
        "institution": string | null,
        "qualification": string | null,
        "field_of_study": string | null,
        "graduation_year": number | null
      }
    ],
    "target_roles": string[],
    "target_industries": string[],
    "location_preference": string | null,
    "seniority_level": "junior" | "mid" | "senior" | "lead" | "executive" | null
  },
  "ai_suggestions": [
     {
       "type": "critical_fix" | "enhancement" | "design_feedback" | "content_gap" | "impact_opportunity" | "ats_optimization",
       "priority": "high" | "medium" | "low",
       "category": "formatting" | "content" | "structure" | "keywords" | "impact",
       "suggestion": "Specific actionable advice",
       "original_text": "The original text (if applicable) or null",
       "suggested_rewrite": "An improved rewrite of the original text (if applicable) or null",
       "rationale": "Why this matters for career advancement",
       "implementation_effort": "quick" | "moderate" | "significant"
     }
  ]
}

QUALITY STANDARDS:
- Provide specific, measurable improvements
- Include industry-specific keywords for target roles
- Suggest quantifiable achievements where possible
- Consider Singapore job market context
- Balance technical accuracy with readability

Rules:
- Infer years_experience approximately from timelines if not explicitly stated.
- Keep arrays reasonably small (max ~20 items per list).
- Use null when information is missing.
- Prioritize suggestions that will have the biggest impact on job applications.
- Respond with VALID JSON ONLY.`;

export async function buildResumeProfile(
  rawText: string,
  images: string[] = [],
): Promise<{ profile: ResumeProfile; suggestions: ResumeSuggestion[] }> {
  const client = getOpenAIClient();
  const prompt = [
    "Resume text:",
    "----------------",
    rawText.slice(0, 24000),
    "----------------",
  ].join("\n");

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: "text", text: prompt }];

  for (const imgUrl of images.slice(0, 3)) {
    userContent.push({
      type: "image_url",
      image_url: { url: imgUrl, detail: "high" },
    });
  }

  const response = await client.chat.completions.create({
    model: RESUME_PROFILE_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: RESUME_PROFILE_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: { profile: ResumeProfile; ai_suggestions: ResumeSuggestion[] };
  try {
    parsed = JSON.parse(raw) as { profile: ResumeProfile; ai_suggestions: ResumeSuggestion[] };
    if (!parsed.profile) throw new Error("Missing profile");
  } catch {
    return {
      profile: {
        headline: null,
        summary: null,
        skills: [],
        years_experience: null,
        experiences: [],
        education: [],
        target_roles: [],
        target_industries: [],
        location_preference: null,
        seniority_level: null,
      },
      suggestions: [
        {
          type: "critical_fix",
          priority: "high",
          category: "content",
          suggestion: "Could not parse resume text properly.",
        },
      ],
    };
  }

  return {
    profile: {
      headline: parsed.profile.headline ?? null,
      summary: parsed.profile.summary ?? null,
      skills: parsed.profile.skills ?? [],
      years_experience: parsed.profile.years_experience ?? null,
      experiences: parsed.profile.experiences ?? [],
      education: parsed.profile.education ?? [],
      target_roles: parsed.profile.target_roles ?? [],
      target_industries: parsed.profile.target_industries ?? [],
      location_preference: parsed.profile.location_preference ?? null,
      seniority_level: parsed.profile.seniority_level ?? null,
    },
    suggestions: parsed.ai_suggestions ?? [],
  };
}
