import { NextResponse } from "next/server";
import { getAuthenticatedUser, listDocuments } from "@/lib/services/db";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const documents = await listDocuments(user.id);
  return NextResponse.json({ documents });
}
