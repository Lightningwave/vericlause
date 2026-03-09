import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import type { ComplianceVerdict, ExtractedContract } from "@/lib/types";

const INDEX_NAME = process.env.PINECONE_INDEX || "vericlause-laws";
const NAMESPACE = "employment_act";
const TOP_K = 5;

const VERDICT_PROMPT = `You are a compliance checker for Singapore employment law. You will be given:
1) A contract clause or value (from the user's employment contract).
2) Relevant excerpts from the Singapore Employment Act or Workplace Fairness Act.

Your task: Compare the contract to the law. Output exactly one JSON object (no markdown, no extra text) with:
- clause_type: short identifier (e.g. "notice_period", "annual_leave", "retirement_age")
- contract_value: what the contract says (string)
- law_value: what the law says (string)
- verdict: one of "compliant", "caution", "violated"
- citation: section or part of the act if relevant (string or null)
- explanation: one short sentence (string)

Rules: Base your answer ONLY on the provided law excerpts. Do not hallucinate. If the law text is missing or unclear, use verdict "caution" and explain. Output valid JSON only.`;

function stripCodeBlock(text: string): string {
  let content = text.trim();
  if (content.startsWith("```")) {
    const lines = content.split("\n");
    if (lines[0].startsWith("```")) lines.shift();
    if (lines.length > 0 && lines[lines.length - 1].trim() === "```") lines.pop();
    content = lines.join("\n");
  }
  return content;
}

async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error("PINECONE_API_KEY not set");
  const pc = new Pinecone({ apiKey });
  return pc.index(INDEX_NAME);
}

export async function retrieveLawChunks(query: string, topK = TOP_K): Promise<string[]> {
  const index = getPineconeIndex();
  const vector = await embedQuery(query);
  const res = await index.namespace(NAMESPACE).query({
    vector,
    topK,
    includeMetadata: true,
  });
  return (res.matches ?? [])
    .map((m) => (m.metadata as Record<string, unknown>)?.text as string)
    .filter(Boolean);
}

async function verdictForClause(
  clauseType: string,
  contractValue: string,
  lawChunks: string[],
): Promise<ComplianceVerdict> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return {
      clause_type: clauseType,
      contract_value: contractValue,
      law_value: null,
      verdict: "caution",
      citation: null,
      explanation: "Configuration error: GROQ_API_KEY not set.",
    };
  }

  const lawText = lawChunks.length > 0
    ? lawChunks.join("\n\n---\n\n")
    : "(No law excerpts retrieved.)";

  const userContent = `Contract clause type: ${clauseType}\nContract value: ${contractValue}\n\nRelevant law excerpts:\n${lawText}`;

  const client = new Groq({ apiKey: groqKey });
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: VERDICT_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const content = stripCodeBlock(raw);

  try {
    const data = JSON.parse(content) as Record<string, unknown>;
    const v = data.verdict as string;
    return {
      clause_type: (data.clause_type as string) ?? clauseType,
      contract_value: (data.contract_value as string) ?? contractValue,
      law_value: (data.law_value as string) ?? null,
      verdict: (["compliant", "caution", "violated"].includes(v) ? v : "caution") as ComplianceVerdict["verdict"],
      citation: (data.citation as string) ?? null,
      explanation: (data.explanation as string) ?? null,
    };
  } catch {
    return {
      clause_type: clauseType,
      contract_value: contractValue,
      law_value: null,
      verdict: "caution",
      citation: null,
      explanation: "Could not parse model response.",
    };
  }
}

export async function runComplianceCheck(
  extracted: ExtractedContract,
  rawText: string,
): Promise<ComplianceVerdict[]> {
  const verdicts: ComplianceVerdict[] = [];

  // Notice period
  let contractNotice: string | null = null;
  if (extracted.notice_period_days != null) contractNotice = `${extracted.notice_period_days} days`;
  else if (extracted.notice_period_weeks != null) contractNotice = `${extracted.notice_period_weeks} weeks`;
  else if (extracted.notice_period_months != null) contractNotice = `${extracted.notice_period_months} months`;

  if (contractNotice) {
    const chunks = await retrieveLawChunks("minimum notice period employee employer Singapore Employment Act 2026");
    verdicts.push(await verdictForClause("notice_period", contractNotice, chunks));
  }

  // Annual leave
  if (extracted.annual_leave_days != null) {
    const chunks = await retrieveLawChunks("annual leave entitlement minimum days Singapore Employment Act");
    verdicts.push(await verdictForClause("annual_leave", `${extracted.annual_leave_days} days`, chunks));
  }

  // Retirement age
  if (extracted.retirement_age != null) {
    const chunks = await retrieveLawChunks("retirement age re-employment age 2026 Singapore Employment Act");
    verdicts.push(await verdictForClause("retirement_age", String(extracted.retirement_age), chunks));
  }

  // Fallback generic check
  if (verdicts.length === 0 && rawText) {
    const chunks = await retrieveLawChunks("Singapore Employment Act 1968 Part IV key provisions 2026");
    verdicts.push(await verdictForClause("general", rawText.slice(0, 200), chunks));
  }

  return verdicts;
}

export function complianceScore(verdicts: ComplianceVerdict[]): number {
  if (verdicts.length === 0) return 0;
  const scores: Record<string, number> = { compliant: 100, caution: 50, violated: 0 };
  const total = verdicts.reduce((sum, v) => sum + (scores[v.verdict] ?? 50), 0);
  return Math.round((total / verdicts.length) * 10) / 10;
}
