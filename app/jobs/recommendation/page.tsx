"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

type RecommendedJob = {
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  listingUrl: string;
};

export default function JobRecommendationPage() {
  const { t } = useLanguage();

  const recommendedJob: RecommendedJob = {
    title: "Operations Executive",
    company: "NovaEdge Consulting",
    location: "Singapore",
    salary: "SGD 3,800 - 4,500",
    matchScore: 88,
    listingUrl:
      "https://www.mycareersfuture.gov.sg/job/operations-executive-example",
  };

  const strengths = [
    "Strong coordination and documentation experience",
    "Relevant operations and administrative skills",
    "Communication and stakeholder management abilities",
  ];

  const improvements = [
    "Add measurable achievements in your previous roles",
    "Highlight project coordination experience more clearly",
    "Include industry-specific tools used in operations roles",
  ];

  return (
    <div className="min-h-screen bg-white">
      <SiteNavbar
        links={[
          { href: "/", label: "nav_home" },
          { href: "/resume", label: "nav_resume" },
          { href: "/jobs", label: "jobs_nav" },
        ]}
        rightSlot={
          <Link
            href="/auth/sign-in"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-navy-200 hover:text-navy-950"
          >
            {t("sign_in")}
          </Link>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-14 md:py-18">
        <section className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-600">
            {t("jobs_recommendation_badge")}
          </p>

          <h1 className="font-serif text-4xl font-bold text-navy-950 md:text-5xl">
            {t("jobs_recommendation_title")}
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            {t("jobs_recommendation_description")}
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                {t("jobs_recommendation_score")}
              </p>

              <h2 className="mt-2 font-serif text-4xl font-bold text-navy-950">
                {recommendedJob.matchScore}
                <span className="ml-1 text-xl text-slate-400">/100</span>
              </h2>

              <div className="mt-5 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gold-500"
                  style={{ width: `${recommendedJob.matchScore}%` }}
                />
              </div>

              <p className="mt-4 text-sm text-slate-600">
                {t("jobs_recommendation_score_note")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("jobs_recommendation_strengths")}
              </h3>

              <ul className="mt-4 space-y-3">
                {strengths.map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-700">
                    <span className="text-emerald-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("jobs_recommendation_improve")}
              </h3>

              <ul className="mt-4 space-y-3">
                {improvements.map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-700">
                    <span className="text-red-600">!</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="border-b border-slate-100 pb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                {t("jobs_recommendation_best_match")}
              </p>

              <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
                {recommendedJob.title}
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {recommendedJob.company}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="border px-3 py-1 rounded-full bg-white border-slate-200">
                  {recommendedJob.location}
                </span>

                <span className="border px-3 py-1 rounded-full bg-white border-slate-200">
                  {recommendedJob.salary}
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-navy-950">
                  {t("jobs_recommendation_why")}
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  {t("jobs_recommendation_reason")}
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              <a
                href={recommendedJob.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-navy-950 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
              >
                {t("jobs_view_listing")}
              </a>

              <Link
                href="/jobs"
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-navy-200 hover:text-navy-950"
              >
                {t("jobs_back_to_list")}
              </Link>

              <Link
                href="/interview"
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-navy-200 hover:text-navy-950"
              >
                {t("jobs_continue_interview")}
              </Link>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}