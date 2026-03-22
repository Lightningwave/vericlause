import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  getDocument,
  deleteDocument,
  getReportsByDocument,
} from "@/lib/services/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc || doc.user_id !== user.id) {
    return NextResponse.json({ detail: "Document not found" }, { status: 404 });
  }

  const reports = await getReportsByDocument(id);
  const latestReport = reports[0] ?? null;

  return NextResponse.json({
    document: {
      id: doc.id,
      file_name: doc.file_name,
      created_at: doc.created_at,
      extracted: doc.extracted,
    },
    report: latestReport
      ? {
          verdicts: latestReport.verdicts,
          compliance_score: latestReport.compliance_score,
          created_at: latestReport.created_at,
        }
      : null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc || doc.user_id !== user.id) {
    return NextResponse.json({ detail: "Document not found" }, { status: 404 });
  }

  await deleteDocument(id);
  return NextResponse.json({ success: true });
}
