import { createClient } from "@/lib/supabase/server";

export type UsageWindow = "lifetime" | "day" | "week" | "month";
export type UsageKind = "contract_full_analysis" | "resume_full_review";

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(value: Date) {
  return value.toISOString();
}

function getWindowStart(window: UsageWindow): string | null {
  if (window === "lifetime") return null;
  if (window === "day") return toIso(startOfDay());
  if (window === "week") return toIso(startOfWeek());
  return toIso(startOfMonth());
}

async function countContractAnalysesSince(
  userId: string,
  sinceIso: string | null,
): Promise<number> {
  const supabase = createClient();

  let query = supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (sinceIso) {
    query = query.gte("created_at", sinceIso);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count contract analyses: ${error.message}`);
  }

  return count ?? 0;
}

async function countResumeReviewsSince(
  userId: string,
  sinceIso: string | null,
): Promise<number> {
  const supabase = createClient();

  let query = supabase
    .from("resumes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("parsed_profile", "is", null);

  if (sinceIso) {
    query = query.gte("created_at", sinceIso);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count resume reviews: ${error.message}`);
  }

  return count ?? 0;
}

export async function getUsageCount(params: {
  userId: string;
  kind: UsageKind;
  window: UsageWindow;
}): Promise<number> {
  const { userId, kind, window } = params;
  const sinceIso = getWindowStart(window);

  if (kind === "contract_full_analysis") {
    return countContractAnalysesSince(userId, sinceIso);
  }

  return countResumeReviewsSince(userId, sinceIso);
}

export async function isWithinUsageLimit(params: {
  userId: string;
  kind: UsageKind;
  window: UsageWindow;
  limit: number | null | undefined;
}): Promise<{
  allowed: boolean;
  used: number;
  remaining: number | null;
  limit: number | null;
}> {
  const { userId, kind, window, limit } = params;

  const used = await getUsageCount({ userId, kind, window });

  if (limit == null) {
    return {
      allowed: true,
      used,
      remaining: null,
      limit: null,
    };
  }

  const remaining = Math.max(limit - used, 0);

  return {
    allowed: used < limit,
    used,
    remaining,
    limit,
  };
}

export function buildUsageLimitMessage(params: {
  kind: UsageKind;
  window: UsageWindow;
  limit: number | null;
}): string {
  const { kind, window, limit } = params;

  if (limit == null) {
    return "Unlimited usage.";
  }

  if (kind === "contract_full_analysis") {
    if (window === "lifetime") {
      return `You have reached your free limit of ${limit} full contract analysis. Upgrade to Pro for more monthly analyses.`;
    }
    if (window === "month") {
      return `You have reached your monthly limit of ${limit} full contract analyses.`;
    }
  }

  if (kind === "resume_full_review") {
    if (window === "day") {
      return `You have reached your daily limit of ${limit} AI reviews.`;
    }
    if (window === "week") {
      return `You have reached your weekly limit of ${limit} full resume reviews. Upgrade to Pro for more monthly reviews.`;
    }
    if (window === "month") {
      return `You have reached your monthly limit of ${limit} full resume reviews.`;
    }
  }

  return "You have reached your usage limit.";
}