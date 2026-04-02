import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContractAnalysisLimit, getResumeReviewLimit } from "@/lib/billing/access";
import { isWithinUsageLimit } from "@/lib/billing/usage";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [contractLimit, reviewLimit] = await Promise.all([
      getContractAnalysisLimit(user.id),
      getResumeReviewLimit(user.id),
    ]);

    const [contractUsage, reviewUsage] = await Promise.all([
      isWithinUsageLimit({
        userId: user.id,
        kind: "contract_full_analysis",
        window: contractLimit.window,
        limit: contractLimit.limit,
      }),
      isWithinUsageLimit({
        userId: user.id,
        kind: "resume_full_review",
        window: reviewLimit.window,
        limit: reviewLimit.limit,
      }),
    ]);

    return NextResponse.json({
      contracts: {
        window: contractLimit.window,
        used: contractUsage.used,
        limit: contractUsage.limit,
        remaining: contractUsage.remaining,
      },
      aiReviews: {
        window: reviewLimit.window,
        used: reviewUsage.used,
        limit: reviewUsage.limit,
        remaining: reviewUsage.remaining,
      },
    });
  } catch (error) {
    console.error("Failed to fetch usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage statistics." },
      { status: 500 },
    );
  }
}
