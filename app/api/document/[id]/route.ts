import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getDocument } from "@/lib/services/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const doc = await getDocument(params.id);
  if (!doc) {
    return NextResponse.json({ detail: "Document not found or expired" }, { status: 404 });
  }

  return NextResponse.json({
    document_id: doc.id,
    file_name: doc.file_name,
    raw_text_length: doc.raw_text.length,
    extracted: doc.extracted,
    created_at: doc.created_at,
  });
}
