import { NextRequest, NextResponse } from "next/server";
import { purgeDocument } from "@/lib/services/store";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  purgeDocument(params.id);
  return NextResponse.json({ ok: true, document_id: params.id });
}
