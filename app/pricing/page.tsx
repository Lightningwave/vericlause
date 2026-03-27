"use client";

import Link from "next/link";
import { Check, Sparkles, ShieldCheck, Users } from "lucide-react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

type Plan = {
  key: string;
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  href: string;
  highlight: boolean;
  features: string[];
};

function PlanCard({
  plan,
}: {
  plan: Plan;
}) {
  return (
    <div
      className={[
        "relative flex h-full flex-col rounded-3xl border p-8 shadow-sm transition-all",
        plan.highlight
          ? "border-navy-950 bg-navy-950 text-white shadow-lg"
          : "border-slate-200 bg-white text-slate-900 hover:-translate-y-1 hover:shadow-md",
      ].join(" ")}
    >
      {plan.highlight ? (
        <span className="absolute -top-3 left-8 rounded-full bg-[#b88a44] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
          {plan.key === "pro" ? "Most popular" : ""}
        </span>
      ) : null}

      <div>
        <h2 className="text-2xl font-semibold">{plan.name}</h2>
        <p
          className={[
            "mt-3 text-sm leading-6",
            plan.highlight ? "text-slate-200" : "text-slate-600",
          ].join(" ")}
        >
          {plan.description}
        </p>
      </div>

      <div className="mt-8 flex items-end gap-1">
        <span className="text-4xl font-semibold">{plan.price}</span>
        <span
          className={[
            "pb-1 text-sm",
            plan.highlight ? "text-slate-200" : "text-slate-500",
          ].join(" ")}
        >
          {plan.period}
        </span>
      </div>

      <ul className="mt-8 space-y-4">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check
              className={[
                "mt-0.5 h-5 w-5 shrink-0",
                plan.highlight ? "text-white" : "text-[#b88a44]",
              ].join(" ")}
            />
            <span
              className={[
                "text-sm leading-6",
                plan.highlight ? "text-slate-100" : "text-slate-700",
              ].join(" ")}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Link
          href={plan.href}
          className={[
            "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition",
            plan.highlight
              ? "bg-white text-navy-950 hover:bg-slate-100"
              : "bg-navy-950 text-white hover:opacity-90",
          ].join(" ")}
        >
          {plan.cta}
        </Link>
      </div>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-navy-950">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-navy-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default function PricingPage() {
  const { t } = useLanguage();

  const plans: Plan[] = [
    {
      key: "free",
      name: t("pricing_plan_free_name"),
      price: t("pricing_plan_free_price"),
      period: t("pricing_plan_period"),
      description: t("pricing_plan_free_description"),
      cta: t("pricing_plan_free_cta"),
      href: "/auth/sign-up",
      highlight: false,
      features: [
        t("pricing_plan_free_feature_1"),
        t("pricing_plan_free_feature_2"),
        t("pricing_plan_free_feature_3"),
        t("pricing_plan_free_feature_4"),
        t("pricing_plan_free_feature_5"),
      ],
    },
    {
      key: "pro",
      name: t("pricing_plan_pro_name"),
      price: t("pricing_plan_pro_price"),
      period: t("pricing_plan_period"),
      description: t("pricing_plan_pro_description"),
      cta: t("pricing_plan_pro_cta"),
      href: "/auth/sign-up",
      highlight: true,
      features: [
        t("pricing_plan_pro_feature_1"),
        t("pricing_plan_pro_feature_2"),
        t("pricing_plan_pro_feature_3"),
        t("pricing_plan_pro_feature_4"),
        t("pricing_plan_pro_feature_5"),
        t("pricing_plan_pro_feature_6"),
      ],
    },
    {
      key: "business",
      name: t("pricing_plan_business_name"),
      price: t("pricing_plan_business_price"),
      period: t("pricing_plan_period"),
      description: t("pricing_plan_business_description"),
      cta: t("pricing_plan_business_cta"),
      href: "mailto:sales@vericlause.com",
      highlight: false,
      features: [
        t("pricing_plan_business_feature_1"),
        t("pricing_plan_business_feature_2"),
        t("pricing_plan_business_feature_3"),
        t("pricing_plan_business_feature_4"),
        t("pricing_plan_business_feature_5"),
        t("pricing_plan_business_feature_6"),
      ],
    },
  ];

  const commonBenefits = [
    t("pricing_common_feature_1"),
    t("pricing_common_feature_2"),
    t("pricing_common_feature_3"),
    t("pricing_common_feature_4"),
  ];

  const faqs = [
    {
      question: t("pricing_faq_1_q"),
      answer: t("pricing_faq_1_a"),
    },
    {
      question: t("pricing_faq_2_q"),
      answer: t("pricing_faq_2_a"),
    },
    {
      question: t("pricing_faq_3_q"),
      answer: t("pricing_faq_3_a"),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteNavbar
        rightSlot={
          <div className="flex items-center gap-3">
            <Link
              href="/auth/sign-in"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {t("sign_in")}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              {t("nav_dashboard")}
            </Link>
          </div>
        }
      />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            {t("pricing_badge")}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            {t("pricing_title")}
          </h1>
          <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
            {t("pricing_description")}
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} />
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <ValueCard
              icon={<Sparkles className="h-5 w-5" />}
              title={t("pricing_value_1_title")}
              description={t("pricing_value_1_description")}
            />
            <ValueCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title={t("pricing_value_2_title")}
              description={t("pricing_value_2_description")}
            />
            <ValueCard
              icon={<Users className="h-5 w-5" />}
              title={t("pricing_value_3_title")}
              description={t("pricing_value_3_description")}
            />
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
                {t("pricing_guidance_badge")}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-navy-950">
                {t("pricing_guidance_title")}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {t("pricing_guidance_description")}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-navy-950">
                    {t("pricing_guidance_free_title")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("pricing_guidance_free_description")}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-navy-950">
                    {t("pricing_guidance_pro_title")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("pricing_guidance_pro_description")}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-navy-950">
                    {t("pricing_guidance_business_title")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("pricing_guidance_business_description")}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-navy-950">
                  {t("pricing_common_title")}
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {commonBenefits.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#b88a44]" />
                      <span className="text-sm leading-6 text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
                  {t("pricing_faq_badge")}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-navy-950">
                  {t("pricing_faq_title")}
                </h2>
              </div>

              {faqs.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <h3 className="text-lg font-semibold text-navy-950">{item.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}