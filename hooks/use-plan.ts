import { useState, useEffect } from "react";
import { type PlanKey, type PlanFeatures, type PlanLimits } from "@/lib/billing/plans";

type PlanInfo = {
  key: PlanKey;
  displayName: string;
  limits: PlanLimits;
  features: PlanFeatures;
  currentPeriodEnd: string | null;
  /** True when Stripe subscription is set to cancel at period end; access until currentPeriodEnd. */
  subscriptionCancelAtPeriodEnd: boolean;
};

export function usePlan() {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const response = await fetch("/api/billing/plan");
        if (!response.ok) {
          throw new Error("Failed to fetch plan info");
        }
        const data = await response.json();
        setPlan({
          ...data,
          subscriptionCancelAtPeriodEnd: Boolean(data.subscriptionCancelAtPeriodEnd),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, []);

  const hasFeature = (feature: keyof PlanFeatures) => {
    return plan?.features[feature] || false;
  };

  const getDaysRemaining = () => {
    if (!plan?.currentPeriodEnd) return null;
    const end = new Date(plan.currentPeriodEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return { plan, loading, error, hasFeature, getDaysRemaining };
}
