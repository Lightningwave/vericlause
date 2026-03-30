import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getAnalysisJob } from "@/lib/services/db";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, context: { params: { job_id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const jobId = context.params.job_id;
  if (!jobId) {
    return NextResponse.json({ detail: "job_id is required" }, { status: 400 });
  }

  const job = await getAnalysisJob(jobId, user.id);
  if (!job) {
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }

  let report: unknown = null;
  if (job.report_id) {
    const supabase = createClient();
    const { data } = await supabase
      .from("reports")
      .select("id, verdicts, compliance_score, created_at, document_id")
      .eq("id", job.report_id)
      .single();
    report = data ?? null;
  }

  return NextResponse.json({ job, report });
}

