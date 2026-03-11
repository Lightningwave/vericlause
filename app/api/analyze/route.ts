import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getDocument, insertReport } from "@/lib/services/db";
import { runComplianceCheck, complianceScore } from "@/lib/services/rag";
import type { ExtractedContract, EmployeeContext, ComplianceReport } from "@/lib/types";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { document_id, employee_context } = body as {
    document_id: string;
    employee_context?: EmployeeContext;
  };

  const doc = await getDocument(document_id);
  if (!doc) {
    return NextResponse.json({ detail: "Document not found or expired" }, { status: 404 });
  }

  if (!doc.extracted) {
    return NextResponse.json(
      { detail: "Document has no extracted entities. Re-upload and ensure extraction succeeded." },
      { status: 422 },
    );
  }

  const extracted: ExtractedContract = doc.extracted;
  const ctx: EmployeeContext = employee_context ?? {
    monthly_salary: extracted.salary,
    work_type: null,
  };
  const verdicts = await runComplianceCheck(extracted, doc.raw_text, ctx);
  const score = complianceScore(verdicts);

  await insertReport(document_id, user.id, verdicts, score);

  const report: ComplianceReport = {
    document_id,
    extracted,
    verdicts,
    compliance_score: score,
  };

  return NextResponse.json(report);
}
