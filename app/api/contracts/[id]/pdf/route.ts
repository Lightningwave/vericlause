import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getDocument } from "@/lib/services/db";
import { createClient } from "@/lib/supabase/server";

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

  if (!doc.file_path) {
    return NextResponse.json({ detail: "No PDF stored for this document" }, { status: 404 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("contracts")
    .download(doc.file_path);

  if (error || !data) {
    return NextResponse.json({ detail: "Failed to retrieve PDF" }, { status: 500 });
  }

  const buffer = Buffer.from(await data.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.file_name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
