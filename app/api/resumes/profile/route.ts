import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getResume } from "@/lib/services/db";
import { maxJsonBodyBytes, parseJsonBody } from "@/lib/api/limits";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";
import { executeProfilingForResume } from "@/lib/services/resumeProfiling";
import { getResumeReviewLimit } from "@/lib/billing/access";
import {
  buildUsageLimitMessage,
  isWithinUsageLimit,
} from "@/lib/billing/usage";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  if (!allowRateLimit(user.id, "profile")) {
    return rateLimitedResponse(60);
  }

  const jsonIn = await parseJsonBody<{ resume_id?: string }>(
    req,
    maxJsonBodyBytes(),
  );

  if (!jsonIn.ok) {
    return jsonIn.response;
  }

  const { resume_id } = jsonIn.data ?? {};

  if (!resume_id || typeof resume_id !== "string") {
    return NextResponse.json(
      { detail: "resume_id is required" },
      { status: 400 },
    );
  }

  const resume = await getResume(resume_id, user.id);
  if (!resume) {
    return NextResponse.json({ detail: "Resume not found" }, { status: 404 });
  }

  const hasExistingProfile = !!resume.parsed_profile;

  if (!hasExistingProfile) {
    const reviewLimit = await getResumeReviewLimit(user.id);

    const usage = await isWithinUsageLimit({
      userId: user.id,
      kind: "resume_full_review",
      window: reviewLimit.window,
      limit: reviewLimit.limit,
    });

    if (!usage.allowed) {
      return NextResponse.json(
        {
          detail: buildUsageLimitMessage({
            kind: "resume_full_review",
            window: reviewLimit.window,
            limit: reviewLimit.limit,
          }),
          code: "resume_review_limit_reached",
          used: usage.used,
          remaining: usage.remaining,
          limit: usage.limit,
          window: reviewLimit.window,
        },
        { status: 403 },
      );
    }
  }

  const result = await executeProfilingForResume(resume_id, user.id);

  if (result.status === "running") {
    return NextResponse.json({ job_id: result.job_id, status: "running" });
  }

  return NextResponse.json({
    job_id: result.job_id,
    status: "succeeded",
    profile: result.profile,
    suggestions: result.suggestions,
  });
}