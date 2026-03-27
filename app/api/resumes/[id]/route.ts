import { NextRequest, NextResponse } from "next/server";
import { deleteResume, getAuthenticatedUser, getResume } from "@/lib/services/db";

function isNotFoundMessage(msg: string) {
  return msg === "Resume not found";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resume = await getResume(id, user.id);
  if (!resume) {
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ resume });
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

  try {
    await deleteResume(id, user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (isNotFoundMessage(msg)) {
      return NextResponse.json({ detail: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ detail: msg || "Failed to delete resume" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
