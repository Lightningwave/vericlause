import { NextRequest, NextResponse } from "next/server";
import { getDocument, purgeDocument } from "@/lib/services/store";
import { runComplianceCheck, complianceScore } from "@/lib/services/rag";
import type { ExtractedContract, ComplianceReport } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { document_id, purge_after = true } = body as {
    document_id: string;
    purge_after?: boolean;
  };

  const doc = getDocument(document_id);
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
  const verdicts = await runComplianceCheck(extracted, doc.rawText);
  const score = complianceScore(verdicts);

  const report: ComplianceReport = {
    document_id,
    extracted,
    verdicts,
    compliance_score: score,
  };

  if (purge_after) {
    purgeDocument(document_id);
  }

  return NextResponse.json(report);
}
