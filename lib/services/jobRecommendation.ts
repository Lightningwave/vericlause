import OpenAI from "openai";
import type { ResumeProfile } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MCFJob {
  uuid: string;
  title: string;
  postedCompany: { name: string } | null;
  company?: { name: string } | null;
  salary: { minimum: number | null; maximum: number | null };
  employmentTypes: { employmentType: string }[];
  categories: { category: string }[];
  skills: { skill: string }[];
  positionLevels: { position: string }[];
  metadata: { jobPostId: string; jobDetailsUrl?: string; originalPostUrl?: string };
  description?: string;
}

export interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  matchScore: number;
  salaryMin: number | null;
  salaryMax: number | null;
  employmentType: string | null;
  skills: string[];
  applyUrl: string;
  strengths: string[];
  improvements: string[];
  reasoning: string;
  source: "MyCareersFuture";
}

export interface ScrapedJob {
  title: string | null;
  company: string | null;
  description: string | null;
  salary: string | null;
  location: string | null;
  employmentType: string | null;
  skills: string[];
  applyUrl: string;
  source: string;
}

// ---------------------------------------------------------------------------
// MyCareersFuture API
// ---------------------------------------------------------------------------

const MCF_API_BASE = "https://api.mycareersfuture.gov.sg/v2";

function buildMCFSearchQuery(profile: ResumeProfile): string {
  if (profile.target_roles?.length) {
    return profile.target_roles[0];
  }
  if (profile.experiences?.length) {
    return profile.experiences[0].title ?? "";
  }
  return "";
}

export async function fetchMCFJobs(profile: ResumeProfile, limit = 10): Promise<MCFJob[]> {
  const query = buildMCFSearchQuery(profile);
  if (!query) return [];

  const params = new URLSearchParams({
    search: query,
    limit: String(limit),
    page: "0",
  });

  const res = await fetch(`${MCF_API_BASE}/jobs?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "VeriClause/1.0",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`MCF API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return (data.results ?? []) as MCFJob[];
}

// ---------------------------------------------------------------------------
// OpenAI matching
// ---------------------------------------------------------------------------

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}

const MATCH_SYSTEM_PROMPT = `You are an expert Singapore career advisor. Given a candidate's resume profile and a list of job postings, score and rank each job by fit.

For each job return:
- matchScore: 0-100 integer
- strengths: 2-3 bullet points on why the candidate is a good fit
- improvements: 2-3 bullet points on gaps to address
- reasoning: 1-2 sentence overall reasoning
- matchScore: 0–100 integer
- strengths: 2–3 bullet points on why the candidate is a good fit
- improvements: 2–3 bullet points on gaps to address
- reasoning: 1–2 sentence overall reasoning

Return ONLY a JSON object in this exact shape, no extra text:
{
  "matches": [
    {
      "id": "<job uuid>",
      "matchScore": 85,
      "strengths": ["...", "..."],
      "improvements": ["...", "..."],
      "reasoning": "..."
    }
  ]
}

Consider: skills overlap, seniority level, industry match, years of experience, target roles.
Singapore job market context applies.`;

interface MatchResult {
  id: string;
  matchScore: number;
  strengths: string[];
  improvements: string[];
  reasoning: string;
}

export async function scoreJobsWithAI(
  profile: ResumeProfile,
  jobs: MCFJob[],
): Promise<MatchResult[]> {
  if (!jobs.length) return [];

  const client = getOpenAIClient();

  const profileSummary = {
    headline: profile.headline,
    skills: profile.skills.slice(0, 20),
    years_experience: profile.years_experience,
    seniority_level: profile.seniority_level,
    target_roles: profile.target_roles,
    target_industries: profile.target_industries,
    recent_titles: profile.experiences.slice(0, 3).map((e) => e.title),
  };

  const jobSummaries = jobs.map((j) => ({
    id: j.uuid,
    title: j.title,
    company: j.postedCompany?.name ?? j.company?.name ?? "Unknown",
    skills: j.skills?.map((s) => s.skill).slice(0, 10),
    categories: j.categories?.map((c) => c.category),
    positionLevel: j.positionLevels?.[0]?.position ?? null,
  }));

  const userContent = `Candidate Profile:\n${JSON.stringify(profileSummary, null, 2)}\n\nJobs:\n${JSON.stringify(jobSummaries, null, 2)}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: MATCH_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    const results: MatchResult[] = parsed.matches ?? parsed.results ?? parsed.jobs ?? [];
    return results;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Merge MCF jobs + AI scores into final recommendations
// ---------------------------------------------------------------------------

export async function getJobRecommendations(
  profile: ResumeProfile,
): Promise<JobRecommendation[]> {
  const jobs = await fetchMCFJobs(profile, 10);
  if (!jobs.length) return [];

  const scores = await scoreJobsWithAI(profile, jobs);
  const scoreMap = new Map(scores.map((s) => [s.id, s]));

  const recommendations: JobRecommendation[] = jobs.map((job) => {
    const score = scoreMap.get(job.uuid);

    return {
      id: job.uuid,
      title: job.title,
      company: job.postedCompany?.name ?? job.company?.name ?? "Unknown",
      matchScore: score?.matchScore ?? 50,
      salaryMin: job.salary?.minimum ?? null,
      salaryMax: job.salary?.maximum ?? null,
      employmentType: job.employmentTypes?.[0]?.employmentType ?? null,
      skills: job.skills?.map((s) => s.skill).slice(0, 8) ?? [],
      applyUrl: job.metadata?.jobDetailsUrl ?? `https://www.mycareersfuture.gov.sg/job/${job.metadata?.jobPostId ?? job.uuid}`,
      strengths: score?.strengths ?? [],
      improvements: score?.improvements ?? [],
      reasoning: score?.reasoning ?? "This role matches your profile.",
      source: "MyCareersFuture",
    };
  });

  return recommendations.sort((a, b) => b.matchScore - a.matchScore);
}

// ---------------------------------------------------------------------------
// Job URL scraper (any job board)
// ---------------------------------------------------------------------------

const SCRAPE_SYSTEM_PROMPT = `You are a job posting parser. Extract structured information from the raw HTML/text of a job posting page.

Return ONLY a JSON object in this exact shape, no extra text:
{
  "title": string | null,
  "company": string | null,
  "description": string | null,
  "salary": string | null,
  "location": string | null,
  "employmentType": string | null,
  "skills": string[]
}

If a field is not found, use null. For skills, extract up to 15 key skills/requirements mentioned.`;

export async function extractJobFromUrl(url: string): Promise<ScrapedJob> {
  // Detect source from URL
  let source = "Unknown";
  if (url.includes("linkedin.com")) source = "LinkedIn";
  else if (url.includes("mycareersfuture.gov.sg")) source = "MyCareersFuture";
  else if (url.includes("jobstreet.com")) source = "JobStreet";
  else if (url.includes("indeed.com")) source = "Indeed";
  else if (url.includes("glassdoor.com")) source = "Glassdoor";

  // For MCF URLs, use the API directly instead of scraping
  if (source === "MyCareersFuture") {
    const jobMatch = url.match(/JOB-[\w-]+/i);
    const uuidMatch = url.match(/([a-f0-9]{32})$/i);
    const uuidMatch = url.match(/([a-f0-9]{32})(?:[^a-f0-9]|$)/i);
    const jobPostId = jobMatch?.[0] ?? null;
    const uuid = uuidMatch?.[1] ?? null;

    if (jobPostId || uuid) {
      // Use direct job endpoint for UUID, query param for jobPostId
      const endpoint = jobPostId
        ? `${MCF_API_BASE}/jobs?jobPostId=${jobPostId}`
        : `${MCF_API_BASE}/jobs/${uuid}`;

      const res = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          "User-Agent": "VeriClause/1.0",
      const query = jobPostId ? `jobPostId=${jobPostId}` : `uuid=${uuid}`;
      const res = await fetch(
        `${MCF_API_BASE}/jobs?${query}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "VeriClause/1.0",
          },
        },
      });

      if (res.ok) {
        const data = await res.json();
        // jobPostId returns results array, UUID returns direct object
        const job: MCFJob = jobPostId ? data.results?.[0] : data;
        if (job && job.title) {
          return {
            title: job.title ?? null,
            company: job.postedCompany?.name ?? job.company?.name ?? null,
            description: job.description ?? null,
            salary: job.salary?.minimum
              ? `$${job.salary.minimum.toLocaleString()} - $${job.salary.maximum?.toLocaleString() ?? "?"} / month`
              : null,
            location: "Singapore",
            employmentType: job.employmentTypes?.[0]?.employmentType ?? null,
            skills: job.skills?.map((s) => s.skill) ?? [],
            applyUrl: url,
            source: "MyCareersFuture",
          };
        }
      }
    }
  }

  // Fallback: scrape HTML for other job boards
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();

  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);

  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SCRAPE_SYSTEM_PROMPT },
      { role: "user", content: `Job posting page content:\n\n${text}` },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: Omit<ScrapedJob, "applyUrl" | "source">;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      title: null,
      company: null,
      description: null,
      salary: null,
      location: null,
      employmentType: null,
      skills: [],
    };
  }

  return {
    ...parsed,
    skills: parsed.skills ?? [],
    applyUrl: url,
    source,
  };
}