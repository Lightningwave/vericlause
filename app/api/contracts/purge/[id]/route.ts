import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, deleteDocument } from "@/lib/services/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteDocument(id);
  } catch {
    // Already gone or RLS prevented access -- either way, it's purged from this user's perspective
  }

  return NextResponse.json({ ok: true, document_id: id });
}
