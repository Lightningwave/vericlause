"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "../providers/language-provider";
import { usePlan } from "@/hooks/use-plan";
import { User, LogOut, Settings, CreditCard, ChevronDown } from "lucide-react";

export function UserMenu({ onSignOut }: { onSignOut?: () => void | Promise<void> }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { plan, getDaysRemaining } = usePlan();
  const days = getDaysRemaining();

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setSignedIn(!!user);
      setUserEmail(user?.email || null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      setUserEmail(session?.user?.email || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (onSignOut) await onSignOut();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (signedIn === null) {
    return <div className="h-9 w-20 animate-pulse rounded-md bg-slate-100" aria-hidden />;
  }

  if (signedIn) {
    const initial = userEmail?.[0]?.toUpperCase() || "U";

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-950 text-[11px] font-bold text-white uppercase">
            {initial}
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-3 w-64 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] focus:outline-none">
              <div className="mb-1 px-3 py-3 border-b border-slate-50">
                <p className="font-serif text-sm font-bold text-navy-950 truncate tracking-tight">{userEmail}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`h-1 w-1 rounded-full ${plan?.key === "free" ? "bg-slate-300" : "bg-[#b88a44]"}`} />
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                    {plan?.displayName}
                    {days !== null && ` • ${days}d left`}
                  </p>
                </div>
              </div>

              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-navy-950"
              >
                <User className="h-4 w-4 text-slate-400 group-hover:text-navy-950" />
                My Profile
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="group mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 text-red-400 group-hover:text-red-600" />
                {t("dash_sign_out")}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Link
      href="/auth/sign-in"
      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {t("sign_in")}
    </Link>
  );
}
