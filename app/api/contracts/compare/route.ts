import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  createComparisonJob,
  getAuthenticatedUser,
  getDocument,
  getReportsByDocument,
  insertReport,
  updateComparisonJob,
} from "@/lib/services/db";
import { maxJsonBodyBytes, parseJsonBody } from "@/lib/api/limits";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";
import { runComplianceCheck, complianceScore } from "@/lib/services/rag";
import { buildCompareUserPrompt, COMPARE_SYSTEM_MESSAGE } from "@/lib/services/compare";
import type { ExtractedContract, ContractComparison, EmployeeContext } from "@/lib/types";

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

  if (!allowRateLimit(user.id, "llm")) {
    return rateLimitedResponse(60);
  }

  const jsonIn = await parseJsonBody<{
    document_a_id: string;
    document_b_id: string;
  }>(req, maxJsonBodyBytes());
  if (!jsonIn.ok) {
    return jsonIn.response;
  }
  const { document_a_id, document_b_id } = jsonIn.data;

  if (!document_a_id || !document_b_id) {
    return NextResponse.json(
      { detail: "Both document_a_id and document_b_id are required" },
      { status: 400 },
    );
  }

  const [docA, docB] = await Promise.all([
    getDocument(document_a_id),
    getDocument(document_b_id),
  ]);

  if (!docA || !docB || docA.user_id !== user.id || docB.user_id !== user.id) {
    return NextResponse.json({ detail: "One or both documents were not found" }, { status: 404 });
  }

  if (!docA.extracted || !docB.extracted) {
    return NextResponse.json(
      { detail: "Both documents must have extracted data. Re-upload if extraction failed." },
      { status: 422 },
    );
  }

  const job = await createComparisonJob(user.id, document_a_id, document_b_id);
  await updateComparisonJob(job.id, user.id, { status: "running" });

  const ANALYZE_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS ?? 25000);

  const comparisonTask = (async () => {
    try {
      // 1. Ensure both documents have reports (verdicts)
      const fetchOrAnalyze = async (doc: typeof docA) => {
        const reports = await getReportsByDocument(doc.id);
        if (reports.length > 0) return reports[0].verdicts;

        // Run analysis if no report exists
        const extracted = doc.extracted as ExtractedContract;
        const ctx: EmployeeContext = { monthly_salary: extracted.salary, work_type: null };
        const verdicts = await runComplianceCheck(extracted, doc.raw_text, ctx);
        const score = complianceScore(verdicts);
        await insertReport(doc.id, user.id, verdicts, score);
        return verdicts;
      };

      const [verdictsA, verdictsB] = await Promise.all([
        fetchOrAnalyze(docA),
        fetchOrAnalyze(docB),
      ]);

      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: COMPARE_SYSTEM_MESSAGE },
          { role: "user", content: buildCompareUserPrompt(verdictsA, verdictsB) },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);

      const result: ContractComparison = {
        document_a_id,
        document_b_id,
        key_terms: parsed.key_terms ?? [],
        clauses: parsed.clauses ?? [],
        summary: parsed.summary ?? "",
      };

      await updateComparisonJob(job.id, user.id, {
        status: "succeeded",
        result,
      });

      return result;
    } catch (err) {
      console.error("Comparison background task failed:", err);
      await updateComparisonJob(job.id, user.id, {
        status: "failed",
        error: err instanceof Error ? err.message : "Comparison failed",
      });
      throw err;
    }
  })();

  const result = await Promise.race([
    comparisonTask,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ANALYZE_TIMEOUT_MS)),
  ]).catch((err: unknown) => {
    throw err;
  });

  if (result === null) {
    return NextResponse.json({ job_id: job.id, status: "running" });
  }

  return NextResponse.json({
    job_id: job.id,
    status: "succeeded",
    result,
  });
}
