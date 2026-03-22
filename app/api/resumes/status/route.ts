import { NextResponse } from "next/server";
import { getAuthenticatedUser, getResumeStatusForUser } from "@/lib/services/db";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { has_resume: false, has_profile: false, resume_id: null },
      { status: 401 },
    );
  }

  const status = await getResumeStatusForUser(user.id);
  return NextResponse.json(status);
}
