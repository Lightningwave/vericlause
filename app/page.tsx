"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { useLanguage } from "@/components/providers/language-provider";

export default function HomePage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white">
      <SiteNavbar
        rightSlot={<UserMenu />}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              {t("home_eyebrow")}
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl lg:text-6xl">
              {t("home_hero_title")}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {t("home_hero_lead")}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/contract"
                className="rounded-xl bg-navy-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                {t("nav_dashboard")}
              </Link>
              <Link
                href="/resume"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("nav_resume")}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">{t("home_pillar_contracts_label")}</p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">{t("home_pillar_contracts_title")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_pillar_contracts_desc")}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">{t("home_pillar_career_label")}</p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">{t("home_pillar_career_title")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_pillar_career_desc")}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">{t("home_pillar_interview_label")}</p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">{t("home_pillar_interview_title")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_pillar_interview_desc")}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">{t("home_pillar_languages_label")}</p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">{t("home_pillar_languages_title")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_pillar_languages_desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">{t("nav_features")}</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-navy-950 sm:text-4xl">
              {t("home_features_title")}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{t("home_features_lead")}</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-navy-950">{t("home_feature_1_title")}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{t("home_feature_1_desc")}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-navy-950">{t("home_feature_2_title")}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{t("home_feature_2_desc")}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-navy-950">{t("home_feature_3_title")}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{t("home_feature_3_desc")}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-navy-950">{t("home_feature_4_title")}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{t("home_feature_4_desc")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              {t("nav_how_it_works")}
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-navy-950 sm:text-4xl">
              {t("home_how_title")}
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-semibold text-[#b88a44]">01</div>
              <h3 className="mt-3 text-lg font-semibold text-navy-950">{t("home_how_step1_title")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_how_step1_desc")}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-semibold text-[#b88a44]">02</div>
              <h3 className="mt-3 text-lg font-semibold text-navy-950">{t("home_how_step2_title")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_how_step2_desc")}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-semibold text-[#b88a44]">03</div>
              <h3 className="mt-3 text-lg font-semibold text-navy-950">{t("home_how_step3_title")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_how_step3_desc")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">{t("nav_faq")}</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-navy-950 sm:text-4xl">
            {t("home_faq_heading")}
          </h2>

          <div className="mt-10 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-navy-950">{t("home_faq_q1")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_faq_a1")}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-navy-950">{t("home_faq_q2")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_faq_a2")}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-navy-950">{t("home_faq_q3")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("home_faq_a3")}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
