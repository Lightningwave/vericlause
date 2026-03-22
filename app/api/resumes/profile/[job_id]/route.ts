import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getProfilingJob, getResume } from "@/lib/services/db";

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

  const job = await getProfilingJob(jobId, user.id);
  if (!job) {
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }

  /** Always attach latest resume row when job finished so client can read profile even if poll raced. */
  let resume: unknown = null;
  if (job.status === "succeeded" || job.status === "failed") {
    resume = await getResume(job.resume_id, user.id);
  }

  return NextResponse.json({ job, resume });
}
