import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getComparisonJob } from "@/lib/services/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { job_id: jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ detail: "job_id is required" }, { status: 400 });
  }

  const job = await getComparisonJob(jobId, user.id);
  if (!job) {
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
