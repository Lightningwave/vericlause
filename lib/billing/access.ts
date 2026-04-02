import { PLAN_DEFINITIONS, type PlanKey } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";

export type BillingFeature =
  | "contractComparison"
  | "verdictTranslation"
  | "resumeImprove"
  | "voiceResume"
  | "interviewPractice"
  | "prioritySupport";

const MANUAL_PRO_EMAILS = new Set(["test123@gmail.com"]);
const MANUAL_BUSINESS_EMAILS = new Set<string>([]);

export async function getUserPlanKey(_userId: string): Promise<PlanKey> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();

  if (email && MANUAL_BUSINESS_EMAILS.has(email)) {
    return "business";
  }

  if (email && MANUAL_PRO_EMAILS.has(email)) {
    return "pro";
  }

  return "free";
}

export async function getUserPlan(userId: string) {
  const planKey = await getUserPlanKey(userId);
  return PLAN_DEFINITIONS[planKey];
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

  if (plan.key === "free") {
    return {
      window: "week" as const,
      limit: plan.limits.fullResumeReviewsPerWeek ?? null,
    };
  }

  return {
    window: "month" as const,
    limit: plan.limits.fullResumeReviewsPerMonth ?? null,
  };
}

export function isUnlimited(limit: number | null | undefined): boolean {
  return limit == null;
}