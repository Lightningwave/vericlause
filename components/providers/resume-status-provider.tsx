"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getResumeStatus, type ResumeStatus } from "@/lib/api";

type ResumeStatusContextValue = {
  /** Null only before first successful fetch while logged in */
  status: ResumeStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const ResumeStatusContext = createContext<ResumeStatusContextValue | null>(null);

export function ResumeStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ResumeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus({ has_resume: false, has_profile: false, resume_id: null });
      setLoading(false);
      return;
    }

    try {
      const data = await getResumeStatus();
      setStatus(data ?? { has_resume: false, has_profile: false, resume_id: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load resume status");
      setStatus({ has_resume: false, has_profile: false, resume_id: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refetch();
    });
    return () => subscription.unsubscribe();
  }, [refetch]);

  const value = useMemo(
    () => ({
      status,
      loading,
      error,
      refetch,
    }),
    [status, loading, error, refetch],
  );

  return (
    <ResumeStatusContext.Provider value={value}>{children}</ResumeStatusContext.Provider>
  );
}

export function useResumeStatus(): ResumeStatusContextValue {
  const ctx = useContext(ResumeStatusContext);
  if (!ctx) {
    throw new Error("useResumeStatus must be used within ResumeStatusProvider");
  }
  return ctx;
}
