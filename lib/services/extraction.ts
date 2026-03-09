import Groq from "groq-sdk";
import type { ExtractedContract } from "@/lib/types";
import { redactPii } from "./redact";

const SYSTEM_PROMPT = `You are a strict data extractor. Extract ONLY the following fields from the employment contract text. Output valid JSON only. Do not provide advice, interpretation, or any text outside the JSON.

Fields to extract (use null if not found):
- salary: monthly basic salary in SGD (number only)
- job_title: job title (string)
- notice_period_days: notice period in days (integer, or null)
- notice_period_weeks: notice period in weeks (number, or null)
- notice_period_months: notice period in months (number, or null)
- annual_leave_days: annual leave entitlement in days (integer, or null)
- probation_months: probation period in months (number, or null)
- retirement_age: retirement age if stated (integer, or null)

Output format (JSON only, no markdown):
{"salary": null, "job_title": null, "notice_period_days": null, "notice_period_weeks": null, "notice_period_months": null, "annual_leave_days": null, "probation_months": null, "retirement_age": null}`;

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

export async function extractContractEntities(
  contractText: string,
): Promise<ExtractedContract> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const redacted = redactPii(contractText);
  const client = new Groq({ apiKey });

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: redacted.slice(0, 120_000) },
    ],
    temperature: 0,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const content = stripCodeBlock(raw);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error(`LLM did not return valid JSON: ${content.slice(0, 200)}`);
  }

  return {
    salary: typeof data.salary === "number" ? data.salary : null,
    job_title: typeof data.job_title === "string" ? data.job_title : null,
    notice_period_days: typeof data.notice_period_days === "number" ? data.notice_period_days : null,
    notice_period_weeks: typeof data.notice_period_weeks === "number" ? data.notice_period_weeks : null,
    notice_period_months: typeof data.notice_period_months === "number" ? data.notice_period_months : null,
    annual_leave_days: typeof data.annual_leave_days === "number" ? data.annual_leave_days : null,
    probation_months: typeof data.probation_months === "number" ? data.probation_months : null,
    retirement_age: typeof data.retirement_age === "number" ? data.retirement_age : null,
  };
}
