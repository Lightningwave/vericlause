import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/services/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const doc = getDocument(params.id);
  if (!doc) {
    return NextResponse.json({ detail: "Document not found or expired" }, { status: 404 });
  }
  return NextResponse.json({
    document_id: params.id,
    raw_text_length: doc.rawText.length,
    extracted: doc.extracted,
  });
}
