import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getDocument } from "@/lib/services/db";

/** Legacy GET shape (formerly `GET /api/document/[id]`). Prefer `GET /api/contracts/[id]`. */
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
