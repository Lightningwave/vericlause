import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type UsageStats = {
  window: "lifetime" | "day" | "week" | "month";
  used: number;
  limit: number | null;
  remaining: number | null;
};

export type AggregatedUsage = {
  contracts: UsageStats;
  aiReviews: UsageStats;
};

export function useUsage() {
  const [usage, setUsage] = useState<AggregatedUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchUsage() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (mounted) setLoading(false);
          return;
        }

        const res = await fetch("/api/billing/usage");
        if (!res.ok) throw new Error("Failed to fetch usage data.");
        
        const data = await res.json();
        
        if (mounted) {
          setUsage(data);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Unknown error occurred.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchUsage();

    return () => {
      mounted = false;
    };
  }, []);

  return { usage, loading, error };
}
