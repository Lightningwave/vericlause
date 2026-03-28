export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { extractText } from 'unpdf';
import { getAuthenticatedUser } from "@/lib/services/db";

const OPENAI_MODEL = "gpt-4o-mini";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are an elite resume advisory panel 
for Singapore's white-collar job market. You combine the 
expertise of four specialists:

1. LANGUAGE COACH — Reviews tone, grammar, action verb 
   strength, and professional clarity
2. ATS SPECIALIST — Checks keyword density, formatting 
   suitability for applicant tracking systems, and 
   section completeness
3. SINGAPORE MARKET ADVISOR — Validates experience and 
   language against Singapore hiring norms, MOM standards, 
   and local employer expectations
4. CAREER PROGRESSION ANALYST — Assesses career trajectory 
   logic, identifies gaps, and evaluates whether the 
   candidate's progression is competitive for their 
   target level

Analyse the resume and return ONLY a valid JSON object 
with exactly these fields:

{
  "overallImpression": "3 to 4 sentence summary covering 
    the candidate's overall profile strength, market 
    positioning in Singapore, and suitability for their 
    apparent target role",

  "keyStrengths": [
    "strength 1 — be specific, reference actual content 
    from the resume",
    "strength 2",
    "strength 3"
  ],

  "areasToImprove": [
    "gap 1 — be specific, explain why this weakens the 
    resume in Singapore's market",
    "gap 2",
    "gap 3"
  ],

  "suggestedEdits": [
    "edit 1 — provide the exact rewrite, not just advice. 
    Example: Change 'Managed social media' to 'Grew 
    combined social following by 40% to 120,000 across 
    Facebook and Instagram'",
    "edit 2",
    "edit 3"
  ],

  "atsAnalysis": {
    "keywordsFound": ["keyword1", "keyword2", "keyword3"],
    "keywordsMissing": ["missing1", "missing2", "missing3"],
    "atsFriendly": true or false,
    "atsNotes": "One sentence on ATS suitability"
  },

  "careerProgression": "2 sentence assessment of whether 
    the career trajectory is logical and competitive for 
    the candidate's experience level in Singapore",

  "salaryBenchmark": {
    "estimatedRange": "SGD X,000 - Y,000 per month",
    "rationale": "One sentence explaining the estimate 
    based on role level, sector, and years of experience 
    in Singapore"
  },

  "score": a number from 1 to 10 based on this rubric:
    2 points — Quantifiable achievements with specific 
               numbers and dollar values
    2 points — Relevance and alignment to Singapore 
               market and MOM standards  
    2 points — Structure, clarity, and ATS compatibility
    2 points — Action verb strength and language quality
    2 points — Completeness of contact info, work history, 
               education, skills, and career logic
}

Rules:
- Be specific. Reference actual content from the resume.
- No generic advice that could apply to any resume.
- Salary benchmark must reflect Singapore market rates.
- ATS keywords must be relevant to the candidate's field.
- No text outside the JSON object.`;

export interface ResumeFeedback {
  overallImpression: string;
  keyStrengths: string[];
  areasToImprove: string[];
  suggestedEdits: string[];
  atsAnalysis: {
    keywordsFound: string[];
    keywordsMissing: string[];
    atsFriendly: boolean;
    atsNotes: string;
  };
  careerProgression: string;
  salaryBenchmark: {
    estimatedRange: string;
    rationale: string;
  };
  score: number;
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }

  return text.trim();
}

async function callLlm(resumeText: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: resumeText.slice(0, 120_000) },
        ],
        temperature: 0,
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err) {
      console.warn("OpenAI resume analysis failed, falling back to Groq:", err);
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("Neither OPENAI_API_KEY nor GROQ_API_KEY is set");

  const client = new Groq({ apiKey: groqKey });
  const response = await client.chat.completions.create({
    model: GROQ_FALLBACK_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: resumeText.slice(0, 120_000) },
    ],
    temperature: 0,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  const name = (file as File).name ?? "";
  const lower = name.toLowerCase();
  if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
    return NextResponse.json(
      { detail: "Only PDF and DOCX files are accepted" },
      { status: 400 },
    );
  }

  let resumeText: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const { text } = await extractText(uint8Array, { mergePages: true });
    resumeText = text;
  } catch (e) {
    return NextResponse.json(
      { detail: `File could not be read: ${e instanceof Error ? e.message : e}` },
      { status: 422 },
    );
  }

  if (!resumeText.trim()) {
    return NextResponse.json({ detail: "File produced no text" }, { status: 422 });
  }

  let raw: string;
  try {
    raw = await callLlm(resumeText);
  } catch (e) {
    return NextResponse.json(
      { detail: `AI analysis failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  const content = extractJson(raw);
  let feedback: ResumeFeedback;
  try {
    feedback = JSON.parse(content) as ResumeFeedback;
  } catch {
    return NextResponse.json(
      { detail: "AI returned an unexpected response. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ feedback });
}
