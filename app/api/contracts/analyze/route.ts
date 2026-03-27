import { NextRequest, NextResponse } from "next/server";
import { createAnalysisJob, getAuthenticatedUser, getDocument, insertReport, updateAnalysisJob } from "@/lib/services/db";
import { maxJsonBodyBytes, parseJsonBody } from "@/lib/api/limits";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";
import { runComplianceCheck, complianceScore } from "@/lib/services/rag";
import type { ExtractedContract, EmployeeContext } from "@/lib/types";

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
    return NextResponse.json({ detail: "document_id is required" }, { status: 400 });
  }

  const doc = await getDocument(document_id);
  if (!doc) {
    return NextResponse.json({ detail: "Document not found or expired" }, { status: 404 });
  }

  if (doc.user_id !== user.id) {
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }

  const job = await createAnalysisJob(document_id, user.id);
  await updateAnalysisJob(job.id, user.id, {
    status: "running",
    error: null,
    report_id: null,
    progress: 0,
    stage: null,
  });

  if (!doc.extracted) {
    await updateAnalysisJob(job.id, user.id, {
      status: "failed",
      error: "Document has no extracted entities. Re-upload and ensure extraction succeeded.",
    });
    return NextResponse.json(
      { detail: "Document has no extracted entities. Re-upload and ensure extraction succeeded.", job_id: job.id },
      { status: 422 },
    );
  }

  const extracted: ExtractedContract = doc.extracted;
  const ctx: EmployeeContext = employee_context ?? {
    monthly_salary: extracted.salary,
    work_type: null,
  };

  const ANALYZE_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS ?? 25000);

  // Define the analysis task as a self-completing promise
  const analysisTask = (async () => {
    let lastProgressWritten = -1;
    try {
      const verdicts = await runComplianceCheck(extracted, doc.raw_text, ctx, {
        onProgress: async (progress, stage) => {
          if (progress < lastProgressWritten) return;
          lastProgressWritten = progress;
          await updateAnalysisJob(job.id, user.id, {
            status: "running",
            progress,
            stage,
          });
        },
      });
      const score = complianceScore(verdicts);
      await updateAnalysisJob(job.id, user.id, {
        status: "running",
        progress: 97,
        stage: "saving",
      });
      const saved = await insertReport(document_id, user.id, verdicts, score);

      await updateAnalysisJob(job.id, user.id, {
        status: "succeeded",
        error: null,
        report_id: saved.id,
        progress: 100,
        stage: null,
      });

      return {
        document_id,
        extracted,
        verdicts,
        compliance_score: score,
      };
    } catch (err) {
      console.error("Analysis background task failed:", err);
      await updateAnalysisJob(job.id, user.id, {
        status: "failed",
        error: err instanceof Error ? err.message : "Analysis failed",
      });
      throw err;
    }
  })();

  const result = await Promise.race([
    analysisTask,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ANALYZE_TIMEOUT_MS)),
  ]).catch((err: unknown) => {
    // If it failed within the timeout, we still return the error properly
    throw err;
  });

  if (result === null) {
    // Return 200 with "running" status to trigger polling
    return NextResponse.json({ job_id: job.id, status: "running" });
  }

  return NextResponse.json({
    job_id: job.id,
    status: "succeeded",
    report: result,
  });
}
