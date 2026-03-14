import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedUser, getDocument } from "@/lib/services/db";
import type { ExtractedContract, ContractComparison, ClauseComparison, KeyTermComparison } from "@/lib/types";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

function extractKeyTermsSummary(e: ExtractedContract): string {
  return [
    `Job Title: ${e.job_title ?? "N/A"}`,
    `Salary: ${e.salary != null ? `SGD ${e.salary}` : "N/A"}`,
    `Annual Leave: ${e.annual_leave_days != null ? `${e.annual_leave_days} days` : "N/A"}`,
    `Notice Period: ${e.notice_period_days != null ? `${e.notice_period_days} days` : e.notice_period_weeks != null ? `${e.notice_period_weeks} weeks` : e.notice_period_months != null ? `${e.notice_period_months} months` : "N/A"}`,
    `Probation: ${e.probation_months != null ? `${e.probation_months} months` : "N/A"}`,
    `Retirement Age: ${e.retirement_age ?? "N/A"}`,
  ].join("\n");
}

function extractClausesSummary(e: ExtractedContract): string {
  return (e.clauses ?? []).map((c) => `[${c.clause_title}]: ${c.clause_text}`).join("\n\n");
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { document_a_id, document_b_id } = body as {
    document_a_id: string;
    document_b_id: string;
  };

  if (!document_a_id || !document_b_id) {
    return NextResponse.json({ detail: "Both document_a_id and document_b_id are required" }, { status: 400 });
  }

  const [docA, docB] = await Promise.all([getDocument(document_a_id), getDocument(document_b_id)]);

  if (!docA?.extracted || !docB?.extracted) {
    return NextResponse.json(
      { detail: "Both documents must have extracted data. Re-upload if extraction failed." },
      { status: 422 },
    );
  }

  const extA = docA.extracted as ExtractedContract;
  const extB = docB.extracted as ExtractedContract;

  const prompt = `Compare these two employment contracts and return a JSON object.

CONTRACT A - Key Terms:
${extractKeyTermsSummary(extA)}

CONTRACT A - Clauses:
${extractClausesSummary(extA)}

---

CONTRACT B - Key Terms:
${extractKeyTermsSummary(extB)}

CONTRACT B - Clauses:
${extractClausesSummary(extB)}

---

Return a JSON object with:
1. "key_terms": array of objects { "term": string, "contract_a_value": string|null, "contract_b_value": string|null, "assessment": "a_better"|"b_better"|"equal"|"different" } comparing salary, leave, notice, probation, retirement age.
2. "clauses": array of objects { "clause_topic": string, "contract_a_value": string|null, "contract_b_value": string|null, "assessment": "a_better"|"b_better"|"equal"|"different", "explanation": string } comparing each clause topic found in either contract. If a clause exists in one but not the other, set the missing side to null.
3. "summary": a brief 2-3 sentence overall comparison.

Assess from the employee's perspective — "a_better" means Contract A is more favorable for the employee.`;

  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a Singapore employment law expert. Compare two employment contracts objectively. Return valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: { key_terms?: KeyTermComparison[]; clauses?: ClauseComparison[]; summary?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ detail: "Comparison LLM returned invalid JSON" }, { status: 502 });
  }

  const result: ContractComparison = {
    document_a_id,
    document_b_id,
    key_terms: parsed.key_terms ?? [],
    clauses: parsed.clauses ?? [],
    summary: parsed.summary ?? "",
  };

  return NextResponse.json(result);
}
