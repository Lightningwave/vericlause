import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedUser } from "@/lib/services/db";
import type { BenchmarkResult } from "@/lib/types";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { job_title, salary, annual_leave_days, notice_period_days, probation_months } = body as {
    job_title: string;
    salary: number | null;
    annual_leave_days: number | null;
    notice_period_days: number | null;
    probation_months: number | null;
  };

  if (!job_title) {
    return NextResponse.json({ detail: "job_title is required" }, { status: 400 });
  }

  const prompt = `You are a Singapore HR market analyst. Benchmark the following employment contract terms against typical Singapore market ranges for the role "${job_title}".

Contract terms:
- Salary: ${salary != null ? `SGD ${salary}/month` : "Not specified"}
- Annual Leave: ${annual_leave_days != null ? `${annual_leave_days} days` : "Not specified"}
- Notice Period: ${notice_period_days != null ? `${notice_period_days} days` : "Not specified"}
- Probation: ${probation_months != null ? `${probation_months} months` : "Not specified"}

Return a JSON object with:
1. "job_title": the role being benchmarked
2. "items": array of objects, one per term, each with:
   - "term": name of the term (e.g. "Monthly Salary", "Annual Leave", "Notice Period", "Probation Period")
   - "contract_value": string describing what the contract offers (or "Not specified")
   - "market_range": string describing the typical market range for this role in Singapore (e.g. "SGD 3,500 – 5,500/month")
   - "assessment": "above" | "at" | "below" (relative to market). Use "at" if the value is not specified.
   - "explanation": brief 1-2 sentence explanation
3. "overall_summary": 2-3 sentence overall assessment of the contract's competitiveness

Base your market ranges on typical Singapore market data for this type of role. Frame results as indicative estimates.`;

  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a Singapore employment market expert. Return valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: BenchmarkResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ detail: "Benchmark LLM returned invalid JSON" }, { status: 502 });
  }

  const result: BenchmarkResult = {
    job_title: parsed.job_title ?? job_title,
    items: parsed.items ?? [],
    overall_summary: parsed.overall_summary ?? "",
  };

  return NextResponse.json(result);
}
