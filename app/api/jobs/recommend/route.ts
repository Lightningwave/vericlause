import { NextResponse } from "next/server";
import { getAuthenticatedUser, getResume, listResumes } from "@/lib/services/db";
import { getJobRecommendations } from "@/lib/services/jobRecommendation";

/** Uses Supabase auth (cookies); avoid static analysis during `next build`. */
export const dynamic = "force-dynamic";

export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resumeId = searchParams.get("resume_id");

    let profile = null;

    if (resumeId) {
      // Use specific resume
      const resume = await getResume(resumeId, user.id);
      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }
      profile = resume.parsed_profile;
    } else {
      // Use latest resume with a profile
      const resumes = await listResumes(user.id);
      const withProfile = resumes.find((r) => r.parsed_profile != null);
      if (!withProfile) {
        return NextResponse.json(
          { error: "No resume profile found. Please upload and analyse your resume first." },
          { status: 404 },
        );
      }
      profile = withProfile.parsed_profile;
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Resume has not been profiled yet. Please wait for profiling to complete." },
        { status: 400 },
      );
    }

    const recommendations = await getJobRecommendations(profile);

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error("Job recommendation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}