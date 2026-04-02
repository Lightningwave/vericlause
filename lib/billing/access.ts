import { PLAN_DEFINITIONS, type PlanKey } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";

export type BillingFeature =
  | "contractComparison"
  | "verdictTranslation"
  | "resumeImprove"
  | "voiceResume"
  | "interviewPractice"
  | "prioritySupport"
  | "exportReports";

export async function getUserPlanKey(userId: string): Promise<PlanKey> {
  const supabase = createClient();

  // Get plan from database profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  if (profile?.plan) {
    return profile.plan as PlanKey;
  }

  return "free";
}

export async function getUserPlan(userId: string) {
  const planKey = await getUserPlanKey(userId);
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_period_end")
    .eq("id", userId)
    .single();

  return {
    ...PLAN_DEFINITIONS[planKey],
    currentPeriodEnd: profile?.current_period_end || null,
  };
}

export async function hasFeatureAccess(
  userId: string,
  feature: BillingFeature,
): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return plan.features[feature];
}

export async function getContractAnalysisLimit(userId: string) {
  const plan = await getUserPlan(userId);

  if (plan.key === "free") {
    return {
      window: "lifetime" as const,
      limit: plan.limits.fullContractAnalysesLifetime ?? null,
    };
  }

  return {
    window: "month" as const,
    limit: plan.limits.fullContractAnalysesPerMonth ?? null,
  };
}

export async function getResumeReviewLimit(userId: string) {
  const plan = await getUserPlan(userId);

  return {
    window: "day" as const,
    limit: plan.limits.aiReviewsPerDay ?? null,
  };
}

export function isUnlimited(limit: number | null | undefined): boolean {
  return limit == null;
}