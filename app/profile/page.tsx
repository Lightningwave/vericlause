"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { createClient } from "@/lib/supabase/client";
import { usePlan } from "@/hooks/use-plan";
import { useUsage, type UsageStats } from "@/hooks/use-usage";
import { useLanguage } from "@/components/providers/language-provider";
import { 
  User, 
  Shield, 
  CreditCard, 
  CheckCircle2, 
  ExternalLink,
  ArrowLeft,
  Loader2
} from "lucide-react";
export default function ProfilePage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { plan, loading: planLoading, getDaysRemaining } = usePlan();
  const { usage, loading: usageLoading } = useUsage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/sign-in");
      } else {
        setUser(user);
        setLoading(false);
      }
    });
  }, [router]);

  const handleUpgradeToPro = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", locale }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not start checkout.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Could not start checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not open billing portal.");
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetStatus("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setResetStatus("sent");
    } catch (err) {
      console.error("Reset error:", err);
      setResetStatus("error");
    }
  };

  if (loading || planLoading || usageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-navy-950" />
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();

  const renderProgressBar = (stats: UsageStats | undefined, label: string) => {
    if (!stats) return null;
    const isUnlimited = stats.limit === null;
    const percentage = isUnlimited ? 0 : Math.min((stats.used / (stats.limit as number)) * 100, 100);
    const windowText = stats.window === 'lifetime' ? 'total' : `per ${stats.window}`;

    return (
      <div className="mb-6 last:mb-0">
        <div className="mb-2 flex justify-between items-end">
          <p className="text-xs font-bold text-navy-950">{label}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#b88a44]">
            {isUnlimited ? "Unlimited" : `${stats.used} / ${stats.limit}`} <span className="text-slate-300">({windowText})</span>
          </p>
        </div>
        {!isUnlimited && (
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out ${percentage >= 100 ? 'bg-red-500' : 'bg-navy-950'}`} 
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <SiteNavbar rightSlot={<UserMenu />} />

      <main className="mx-auto max-w-2xl px-6 py-16">
        <button 
          onClick={() => router.back()} 
          className="mb-12 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-navy-950"
        >
          <ArrowLeft className="h-3 w-3" />
          Go Back
        </button>

        <header className="mb-16">
          <h1 className="font-serif text-4xl font-bold text-navy-950 tracking-tight">Account</h1>
          <p className="mt-2 text-sm text-slate-500">{user?.email}</p>
        </header>

        <div className="space-y-16">
          {/* Profile Section */}
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b88a44] mb-8 pb-2 border-b border-slate-100">
              Personal Information
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">Email</label>
                <p className="text-sm font-medium text-navy-950">{user?.email}</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">User ID</label>
                <p className="text-[10px] font-mono text-slate-400">{user?.id}</p>
              </div>
            </div>
          </section>

          {/* Subscription Section */}
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b88a44] mb-8 pb-2 border-b border-slate-100">
              Subscription
            </h2>
            <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">Current Plan</label>
                <div className="flex items-center gap-3">
                  <p className="font-serif text-2xl font-bold text-navy-950">{plan?.displayName}</p>
                  {plan?.key !== "free" && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  )}
                </div>
              </div>
              
              {plan?.key !== "free" && daysRemaining !== null && (
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{daysRemaining} days remaining</p>
                </div>
              )}
            </div>

            {plan &&
              plan.key !== "free" &&
              plan.subscriptionCancelAtPeriodEnd &&
              plan.currentPeriodEnd && (
                <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 text-sm text-amber-950">
                  <p className="font-semibold text-amber-900">Subscription canceled</p>
                  <p className="mt-1 text-amber-900/80">
                    Your Pro access continues until{" "}
                    <span className="font-medium text-amber-950">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                        new Date(plan.currentPeriodEnd),
                      )}
                    </span>
                    . You can resubscribe anytime from Manage billing.
                  </p>
                </div>
              )}

            <div className="mt-10 grid gap-4 sm:grid-cols-2 bg-slate-50/50 rounded-xl p-6 border border-slate-50">
              {Object.entries(plan?.features || {}).map(([key, enabled]) => (
                <div key={key} className="flex items-center gap-2">
                  <CheckCircle2 className={`h-3 w-3 ${enabled ? "text-navy-950" : "text-slate-200"}`} />
                  <span className={`text-[11px] ${enabled ? "text-slate-600 font-medium" : "text-slate-300"}`}>
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-10">
              {plan?.key === "free" ? (
                <div className="flex max-w-md flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => void handleUpgradeToPro()}
                    disabled={checkoutLoading}
                    className="inline-flex w-fit items-center gap-2 rounded-full bg-navy-950 px-8 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {checkoutLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Upgrade to Pro
                  </button>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Tip: use your remaining free contract analysis and resume review quota before
                    upgrading—allowances do not carry over from the free tier.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="flex items-center gap-2 text-sm font-bold text-navy-950 transition hover:text-[#b88a44] disabled:opacity-50"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Manage billing & invoices
                      <ExternalLink className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </section>

          {/* Usage Quotas Section */}
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b88a44] mb-8 pb-2 border-b border-slate-100">
              Usage & Quotas
            </h2>
            <div className="max-w-md">
              {usage ? (
                <>
                  {renderProgressBar(usage.contracts, "Contract Analyses")}
                  {renderProgressBar(usage.aiReviews, "AI Resume Reviews")}
                </>
              ) : (
                <p className="text-xs text-slate-400">Loading limits...</p>
              )}
            </div>
          </section>

          {/* Security Section */}
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b88a44] mb-8 pb-2 border-b border-slate-100">
              Identity
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Authenticated via Supabase</p>
                {resetStatus === "sent" && (
                  <p className="mt-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest animate-pulse">
                    Reset link sent to your email!
                  </p>
                )}
                {resetStatus === "error" && (
                  <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                    Failed to send reset link.
                  </p>
                )}
              </div>
              <button 
                onClick={handleResetPassword}
                disabled={resetStatus === "sending" || resetStatus === "sent"}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-navy-950 transition disabled:opacity-50"
              >
                {resetStatus === "sending" ? "Sending..." : "Reset Password"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
