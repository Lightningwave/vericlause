"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { useLanguage } from "@/components/providers/language-provider";

type PlanKey = "free" | "pro" | "business";

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 4.8-3 8.8-7 10-4-1.2-7-5.2-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M20 21v-2a4 4 0 0 0-3-3.87"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.13A4 4 0 0 1 14 10.87"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckItem({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border ${
          dark ? "border-white/20 text-white" : "border-[#d8c5a2] text-[#b88a44]"
        }`}
      >
        ✓
      </span>
      <span className={dark ? "text-sm text-white/90" : "text-sm text-slate-600"}>{children}</span>
    </li>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex rounded-xl bg-slate-100 p-2 text-navy-950">{icon}</div>
      <h3 className="mt-5 text-xl font-semibold text-navy-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function PlanCard({
  plan,
  title,
  description,
  price,
  priceSuffix,
  features,
  cta,
  popular,
  isDark,
  onClick,
  loading,
}: {
  plan: PlanKey;
  title: string;
  description: string;
  price: string;
  priceSuffix: string;
  features: string[];
  cta: string;
  popular?: boolean;
  isDark?: boolean;
  onClick?: () => void;
  loading?: boolean;
}) {
  const fallbackHref =
    plan === "free"
      ? "/auth/sign-up"
      : plan === "business"
        ? "/business-request"
        : "/pricing";

  return (
    <div
      className={`relative flex h-full flex-col rounded-[28px] border p-6 shadow-sm ${
        isDark
          ? "border-navy-950 bg-navy-950 text-white"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      {popular ? (
        <div className="absolute -top-3 left-6 rounded-full bg-[#b88a44] px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          Most Popular
        </div>
      ) : null}

      <h3 className={`text-3xl font-semibold ${isDark ? "text-white" : "text-navy-950"}`}>{title}</h3>
      <p className={`mt-3 min-h-[48px] text-sm leading-6 ${isDark ? "text-white/75" : "text-slate-600"}`}>
        {description}
      </p>

      <div className="mt-8 flex items-end gap-1">
        <span className={`text-5xl font-semibold tracking-tight ${isDark ? "text-white" : "text-navy-950"}`}>
          {price}
        </span>
        <span className={`pb-2 text-sm ${isDark ? "text-white/75" : "text-slate-500"}`}>{priceSuffix}</span>
      </div>

      <ul className="mt-8 space-y-4">
        {features.map((feature) => (
          <CheckItem key={`${plan}-${feature}`} dark={!!isDark}>
            {feature}
          </CheckItem>
        ))}
      </ul>

      <div className="mt-8 flex-1" />

      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className={`mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
            isDark
              ? "bg-white text-navy-950 hover:bg-slate-100 disabled:opacity-60"
              : "bg-navy-950 text-white hover:opacity-90 disabled:opacity-60"
          }`}
        >
          {loading ? "Redirecting..." : cta}
        </button>
      ) : (
        <Link
          href={fallbackHref}
          className={`mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
            isDark ? "bg-white text-navy-950 hover:bg-slate-100" : "bg-navy-950 text-white hover:opacity-90"
          }`}
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { t, locale } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");

  const plans = useMemo(
    () => [
      {
        key: "free" as const,
        title: t("pricing_free_title"),
        description: t("pricing_free_description"),
        price: "S$0",
        priceSuffix: t("pricing_per_month"),
        features: [
          t("pricing_free_feature_1"),
          t("pricing_free_feature_2"),
          t("pricing_free_feature_3"),
          t("pricing_free_feature_4"),
          t("pricing_free_feature_5"),
        ],
        cta: t("pricing_free_cta"),
      },
      {
        key: "pro" as const,
        title: t("pricing_pro_title"),
        description: t("pricing_pro_description"),
        price: "S$9",
        priceSuffix: t("pricing_per_month"),
        features: [
          t("pricing_pro_feature_1"),
          t("pricing_pro_feature_2"),
          t("pricing_pro_feature_3"),
          t("pricing_pro_feature_4"),
          t("pricing_pro_feature_5"),
          t("pricing_pro_feature_6"),
        ],
        cta: t("pricing_pro_cta"),
        popular: true,
        isDark: true,
      },
      {
        key: "business" as const,
        title: t("pricing_business_title"),
        description: t("pricing_business_description"),
        price: "S$29",
        priceSuffix: t("pricing_per_month"),
        features: [
          t("pricing_business_feature_1"),
          t("pricing_business_feature_2"),
          t("pricing_business_feature_3"),
          t("pricing_business_feature_4"),
          t("pricing_business_feature_5"),
        ],
        cta: t("pricing_business_cta"),
      },
    ],
    [t],
  );

  async function startCheckout(plan: PlanKey) {
    try {
      setError("");
      setLoadingPlan(plan);

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          locale,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to create checkout session.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoadingPlan(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      <SiteNavbar rightSlot={<UserMenu />} />

      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b88a44]">
              {t("pricing_eyebrow")}
            </p>
            <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
              {t("pricing_title")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {t("pricing_subtitle")}
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <PlanCard
              plan="free"
              title={plans[0].title}
              description={plans[0].description}
              price={plans[0].price}
              priceSuffix={plans[0].priceSuffix}
              features={plans[0].features}
              cta={plans[0].cta}
            />

            <PlanCard
              plan="pro"
              title={plans[1].title}
              description={plans[1].description}
              price={plans[1].price}
              priceSuffix={plans[1].priceSuffix}
              features={plans[1].features}
              cta={plans[1].cta}
              popular
              isDark
              onClick={() => startCheckout("pro")}
              loading={loadingPlan === "pro"}
            />

            <PlanCard
              plan="business"
              title={plans[2].title}
              description={plans[2].description}
              price={plans[2].price}
              priceSuffix={plans[2].priceSuffix}
              features={plans[2].features}
              cta={plans[2].cta}
            />
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<SparklesIcon />}
            title={t("pricing_value_1_title")}
            description={t("pricing_value_1_description")}
          />
          <FeatureCard
            icon={<ShieldIcon />}
            title={t("pricing_value_2_title")}
            description={t("pricing_value_2_description")}
          />
          <FeatureCard
            icon={<UsersIcon />}
            title={t("pricing_value_3_title")}
            description={t("pricing_value_3_description")}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b88a44]">
              {t("pricing_guidance_eyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-navy-950">
              {t("pricing_guidance_title")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              {t("pricing_guidance_description")}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-navy-950">{t("pricing_free_title")}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t("pricing_guidance_free")}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-navy-950">{t("pricing_pro_title")}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t("pricing_guidance_pro")}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-navy-950">{t("pricing_business_title")}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t("pricing_guidance_business")}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-navy-950">
                {t("pricing_all_plans_title")}
              </h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="text-[#b88a44]">✓</span>
                  <span>{t("pricing_all_plans_1")}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="text-[#b88a44]">✓</span>
                  <span>{t("pricing_all_plans_2")}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="text-[#b88a44]">✓</span>
                  <span>{t("pricing_all_plans_3")}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="text-[#b88a44]">✓</span>
                  <span>{t("pricing_all_plans_4")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b88a44]">
                {t("pricing_faq_eyebrow")}
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-navy-950">{t("pricing_faq_title")}</h2>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-navy-950">{t("pricing_faq_q1")}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{t("pricing_faq_a1")}</p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-navy-950">{t("pricing_faq_q2")}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{t("pricing_faq_a2")}</p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-navy-950">{t("pricing_faq_q3")}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{t("pricing_faq_a3")}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}