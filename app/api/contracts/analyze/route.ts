import { NextRequest, NextResponse } from "next/server";
import {
  createAnalysisJob,
  getAnalysisJob,
  getAuthenticatedUser,
  getDocument,
  getReportsByDocument,
  insertReport,
  updateAnalysisJob,
} from "@/lib/services/db";
import { maxJsonBodyBytes, parseJsonBody } from "@/lib/api/limits";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";
import { runComplianceCheck, complianceScore } from "@/lib/services/rag";
import { getContractAnalysisLimit } from "@/lib/billing/access";
import {
  buildUsageLimitMessage,
  isWithinUsageLimit,
} from "@/lib/billing/usage";
import type { EmployeeContext, ExtractedContract } from "@/lib/types";

const ANALYZE_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS ?? 25000);

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  if (!allowRateLimit(user.id, "llm")) {
    return rateLimitedResponse(60);
  }

  const jsonIn = await parseJsonBody<{
    document_id?: string;
    employee_context?: EmployeeContext;
  }>(req, maxJsonBodyBytes());

  if (!jsonIn.ok) {
    return jsonIn.response;
  }

  const { document_id, employee_context } = jsonIn.data ?? {};

  if (!document_id || typeof document_id !== "string") {
    return NextResponse.json(
      { detail: "document_id is required" },
      { status: 400 },
    );
  }

  const doc = await getDocument(document_id);
  if (!doc || doc.user_id !== user.id) {
    return NextResponse.json({ detail: "Document not found" }, { status: 404 });
  }

  if (!doc.extracted) {
    return NextResponse.json(
      {
        detail:
          "This document does not have extracted contract data. Re-upload the contract and try again.",
      },
      { status: 422 },
    );
  }

  const existingReports = await getReportsByDocument(document_id);
  if (existingReports.length > 0) {
    const latest = existingReports[0];
    return NextResponse.json({
      job_id: `existing-${document_id}`,
      status: "succeeded",
      report: {
        document_id,
        extracted: doc.extracted as ExtractedContract,
        verdicts: latest.verdicts,
        compliance_score: latest.compliance_score,
      },
    });
  }

  const contractLimit = await getContractAnalysisLimit(user.id);
  const usage = await isWithinUsageLimit({
    userId: user.id,
    kind: "contract_full_analysis",
    window: contractLimit.window,
    limit: contractLimit.limit,
  });

  if (!usage.allowed) {
    return NextResponse.json(
      {
        detail: buildUsageLimitMessage({
          kind: "contract_full_analysis",
          window: contractLimit.window,
          limit: contractLimit.limit,
        }),
        code: "contract_analysis_limit_reached",
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit,
        window: contractLimit.window,
      },
      { status: 403 },
    );
  }

  const job = await createAnalysisJob(document_id, user.id);

  const analyzeTask = (async () => {
    try {
      await updateAnalysisJob(job.id, user.id, {
        status: "running",
        progress: 10,
        stage: "Preparing analysis...",
      });

      const extracted = doc.extracted as ExtractedContract;
      const ctx: EmployeeContext = {
        monthly_salary:
          employee_context?.monthly_salary ?? extracted.salary ?? null,
        work_type: employee_context?.work_type ?? null,
      };

      await updateAnalysisJob(job.id, user.id, {
        progress: 35,
        stage: "Reviewing contract clauses...",
      });

      const verdicts = await runComplianceCheck(extracted, doc.raw_text, ctx);

      await updateAnalysisJob(job.id, user.id, {
        progress: 80,
        stage: "Finalising compliance report...",
      });

      const score = complianceScore(verdicts);
      const report = await insertReport(document_id, user.id, verdicts, score);

      await updateAnalysisJob(job.id, user.id, {
        status: "succeeded",
        report_id: report.id,
        progress: 100,
        stage: "Analysis complete",
      });

      return {
        document_id,
        extracted,
        verdicts: report.verdicts,
        compliance_score: report.compliance_score,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Analysis failed";
      await updateAnalysisJob(job.id, user.id, {
        status: "failed",
        error: message,
        stage: "Analysis failed",
      });
      throw error;
    }
  })();

  try {
    const result = await Promise.race([
      analyzeTask,
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), ANALYZE_TIMEOUT_MS),
      ),
    ]);

    if (result === null) {
      const freshJob = await getAnalysisJob(job.id, user.id);
      return NextResponse.json({
        job_id: job.id,
        status: freshJob?.status ?? "running",
      });
    }

    return NextResponse.json({
      job_id: job.id,
      status: "succeeded",
      report: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 },
    );
  }
}