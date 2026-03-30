import { NextRequest, NextResponse } from "next/server";
import { createAnalysisJob, getAuthenticatedUser, getDocument, insertReport, updateAnalysisJob } from "@/lib/services/db";
import { runComplianceCheck, complianceScore } from "@/lib/services/rag";
import type { ExtractedContract, EmployeeContext, ComplianceReport } from "@/lib/types";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }
  const { document_id, employee_context } = (body ?? {}) as {
    document_id?: string;
    employee_context?: EmployeeContext;
  };

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
  await updateAnalysisJob(job.id, user.id, { status: "running", error: null, report_id: null });

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

  const ANALYZE_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS ?? 45000);
  const verdicts = await Promise.race([
    runComplianceCheck(extracted, doc.raw_text, ctx),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("ANALYZE_TIMEOUT")), ANALYZE_TIMEOUT_MS),
    ),
  ]).catch((err: unknown) => {
    if (err instanceof Error && err.message === "ANALYZE_TIMEOUT") {
      return null;
    }
    throw err;
  });

  if (!verdicts) {
    await updateAnalysisJob(job.id, user.id, {
      status: "failed",
      error: "Analysis timed out. Please retry.",
    });
    return NextResponse.json(
      { detail: "Analysis timed out. Please retry.", job_id: job.id },
      { status: 504 },
    );
  }
  const score = complianceScore(verdicts);

  const saved = await insertReport(document_id, user.id, verdicts, score);
  await updateAnalysisJob(job.id, user.id, {
    status: "succeeded",
    error: null,
    report_id: saved.id,
  });

  const report: ComplianceReport = {
    document_id,
    extracted,
    verdicts,
    compliance_score: score,
  };

  return NextResponse.json({ job_id: job.id, status: "succeeded", report });
}
