import OpenAI from "openai";
import Groq from "groq-sdk";
import type { ExtractedContract, ContractClause, ClauseLocation } from "@/lib/types";
import type { PdfPage, PdfPageItem } from "./pdf";
import { redactPii } from "./redact";

const OPENAI_MODEL = "gpt-4o-mini";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are a strict data extractor for Singapore employment contracts. Extract ALL information from the contract.

Output valid JSON only with two sections:

1. "key_terms" — structured fields (use null if not found):
   - salary: monthly basic salary in SGD (number)
   - job_title: job title (string)
   - notice_period_days: notice period in days (integer or null)
   - notice_period_weeks: notice period in weeks (number or null)
   - notice_period_months: notice period in months (number or null)
   - annual_leave_days: annual leave in days (integer or null)
   - probation_months: probation in months (number or null)
   - retirement_age: retirement age if stated (integer or null)

2. "clauses" — an array of EVERY distinct clause or provision in the contract. For each, provide:
   - clause_title: short descriptive name (e.g. "Working Hours", "Overtime Pay", "Sick Leave", "Termination", "Non-Compete", "Confidentiality", "CPF Contributions")
   - clause_text: the actual contract wording for that clause (verbatim or close paraphrase, max 300 words)

Extract as many clauses as exist in the contract. Common clauses include but are not limited to:
- Working Hours, Overtime, Rest Days
- Salary, Bonuses, Allowances, Salary Deductions
- Annual Leave, Sick Leave, Maternity/Paternity Leave, Childcare Leave
- Public Holidays
- Notice Period, Termination, Dismissal
- Probation
- Non-Compete, Restraint of Trade
- Confidentiality, Intellectual Property
- CPF Contributions
- Retirement / Re-employment
- Grievance Procedure, Dispute Resolution
- Governing Law

Output format (JSON only, no markdown):
{
  "key_terms": { "salary": null, "job_title": null, ... },
  "clauses": [ { "clause_title": "...", "clause_text": "..." }, ... ]
}`;

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

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildPageEntries(page: PdfPage) {
  const entries: Array<{
    item: PdfPageItem;
    start: number;
    end: number;
    rawText: string;
  }> = [];
  let fullText = "";
  let offset = 0;

  for (const item of page.items) {
    const rawText = item.value || item.md || "";
    const chunk = normalize(rawText);
    if (!chunk) continue;

    entries.push({
      item,
      start: offset,
      end: offset + chunk.length,
      rawText,
    });
    fullText += chunk + " ";
    offset = fullText.length;
  }

  return { fullText: fullText.trimEnd(), entries };
}

function findBestMatch(
  haystack: string,
  needle: string,
): { start: number; end: number } | null {
  const exact = haystack.indexOf(needle);
  if (exact !== -1) return { start: exact, end: exact + needle.length };

  const needleWords = needle.split(/\s+/).filter(Boolean);
  if (needleWords.length < 3) return null;

  const windowSizes = [
    needleWords.length,
    Math.ceil(needleWords.length * 0.75),
    Math.ceil(needleWords.length * 0.5),
    Math.ceil(needleWords.length * 0.3),
  ];

  for (const winSize of windowSizes) {
    const searchPhrase = needleWords.slice(0, winSize).join(" ");
    const idx = haystack.indexOf(searchPhrase);
    if (idx !== -1) {
      const endPhrase = needleWords.slice(-Math.min(winSize, needleWords.length)).join(" ");
      const endIdx = haystack.indexOf(endPhrase, idx);
      if (endIdx !== -1) {
        return { start: idx, end: endIdx + endPhrase.length };
      }
      return { start: idx, end: Math.min(idx + needle.length, haystack.length) };
    }
  }

  const words = needleWords;
  if (words.length >= 8) {
    const prefix = words.slice(0, Math.min(12, words.length)).join(" ");
    const suffix = words.slice(-Math.min(12, words.length)).join(" ");
    const start = haystack.indexOf(prefix);
    if (start !== -1) {
      const suffixStart = haystack.indexOf(suffix, start + prefix.length);
      if (suffixStart !== -1) {
        return { start, end: suffixStart + suffix.length };
      }
      return { start, end: Math.min(start + needle.length, haystack.length) };
    }
  }

  return null;
}

function scoreMatch(match: { start: number; end: number } | null): number {
  if (!match) return 0;
  return Math.max(0, match.end - match.start);
}

function mergeBoxes(
  boxes: Array<[number, number, number, number]>,
): [number, number, number, number] | undefined {
  if (boxes.length === 0) return undefined;
  const merged: [number, number, number, number] = [...boxes[0]];
  for (const box of boxes.slice(1)) {
    merged[0] = Math.min(merged[0], box[0]);
    merged[1] = Math.min(merged[1], box[1]);
    merged[2] = Math.max(merged[2], box[2]);
    merged[3] = Math.max(merged[3], box[3]);
  }
  return merged;
}

function locateClause(
  clauseText: string,
  pages: PdfPage[],
): { locations: ClauseLocation[]; sourceAnchorText?: string } {
  const needle = normalize(clauseText);
  if (!needle) return { locations: [] };

  let best:
    | {
        page: PdfPage;
        match: { start: number; end: number };
        entries: ReturnType<typeof buildPageEntries>["entries"];
        score: number;
      }
    | undefined;

  for (const page of pages) {
    const { fullText, entries } = buildPageEntries(page);
    if (!fullText || entries.length === 0) continue;

    const match = findBestMatch(fullText, needle);
    const score = scoreMatch(match);
    if (!match || score === 0) continue;

    if (!best || score > best.score) {
      best = { page, match, entries, score };
    }
  }

  if (!best) return { locations: [] };

  const matchedEntries = best.entries.filter(
    (entry) => entry.start < best.match.end && entry.end > best.match.start,
  );

  const anchorTexts = matchedEntries
    .map((entry) => entry.rawText.trim())
    .filter(Boolean);
  const boxes = matchedEntries
    .map((entry) => entry.item.b_box)
    .filter((box): box is [number, number, number, number] => Array.isArray(box));

  const mergedBox = mergeBoxes(boxes);

  return {
    locations: [
      {
        page_number: best.page.page_number,
        ...(mergedBox ? { b_box: mergedBox } : {}),
      },
    ],
    sourceAnchorText: anchorTexts.join(" ").trim() || undefined,
  };
}

async function callLlm(
  redacted: string,
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: redacted.slice(0, 120_000) },
        ],
        temperature: 0,
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err) {
      console.warn("OpenAI extraction failed, falling back to Groq:", err);
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("Neither OPENAI_API_KEY nor GROQ_API_KEY is set");

  const client = new Groq({ apiKey: groqKey });
  const response = await client.chat.completions.create({
    model: GROQ_FALLBACK_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: redacted.slice(0, 120_000) },
    ],
    temperature: 0,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function extractContractEntities(
  contractText: string,
  pages?: PdfPage[],
): Promise<ExtractedContract> {
  const redacted = redactPii(contractText);
  const raw = await callLlm(redacted);
  const content = extractJson(raw);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error(`LLM did not return valid JSON: ${content.slice(0, 200)}`);
  }

  const kt = (data.key_terms ?? data) as Record<string, unknown>;
  const rawClauses = Array.isArray(data.clauses) ? data.clauses : [];

  const clauses: ContractClause[] = rawClauses
    .filter(
      (c: unknown): c is Record<string, unknown> =>
        typeof c === "object" && c !== null,
    )
    .map((c: Record<string, unknown>) => {
      const title = typeof c.clause_title === "string" ? c.clause_title : "Unknown";
      const text = typeof c.clause_text === "string" ? c.clause_text : "";
      const source = pages && pages.length > 0
        ? locateClause(text, pages)
        : { locations: [] as ClauseLocation[] };

      return {
        clause_title: title,
        clause_text: text,
        ...(source.sourceAnchorText ? { source_anchor_text: source.sourceAnchorText } : {}),
        ...(source.locations.length > 0 ? { locations: source.locations } : {}),
      };
    })
    .filter((c: ContractClause) => c.clause_text.length > 0);

  return {
    salary: typeof kt.salary === "number" ? kt.salary : null,
    job_title: typeof kt.job_title === "string" ? kt.job_title : null,
    notice_period_days: typeof kt.notice_period_days === "number" ? kt.notice_period_days : null,
    notice_period_weeks: typeof kt.notice_period_weeks === "number" ? kt.notice_period_weeks : null,
    notice_period_months: typeof kt.notice_period_months === "number" ? kt.notice_period_months : null,
    annual_leave_days: typeof kt.annual_leave_days === "number" ? kt.annual_leave_days : null,
    probation_months: typeof kt.probation_months === "number" ? kt.probation_months : null,
    retirement_age: typeof kt.retirement_age === "number" ? kt.retirement_age : null,
    clauses,
  };
}
