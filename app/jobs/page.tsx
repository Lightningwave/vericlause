"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

type JobItem = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  summary: string;
};

const mockJobs: JobItem[] = [
  {
    id: "1",
    title: "Operations Executive",
    company: "Inter Group",
    location: "Singapore",
    type: "Full-time",
    summary:
      "Support day-to-day operations, coordinate internal workflows, and manage documentation and stakeholder communication.",
  },
  {
    id: "2",
    title: "Project Coordinator",
    company: "VeriClause",
    location: "Singapore",
    type: "Full-time",
    summary:
      "Coordinate project timelines, follow up with cross-functional teams, and maintain reporting and process documentation.",
  },
  {
    id: "3",
    title: "Business Support Associate",
    company: "Regional Advisory Partners",
    location: "Hybrid",
    type: "Full-time",
    summary:
      "Provide administrative and business support across client servicing, reporting, scheduling, and document handling.",
  },
];

export default function JobsPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={
          <Link
            href="/contract"
            className="rounded-md bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("nav_dashboard")}
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            {t("jobs_nav")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            {t("jobs_page_hero_title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            {t("jobs_page_hero_lead")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-navy-950">{t("jobs_available_roles_title")}</h2>
                <p className="mt-1 text-sm text-slate-600">{t("jobs_available_roles_hint")}</p>
              </div>

              <Link
                href="/jobs/recommendation"
                className="rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                {t("nav_recommendation")}
              </Link>
            </div>

            <div className="space-y-4">
              {mockJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-navy-950">{job.title}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {job.company}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {job.location}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {job.type}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">{job.summary}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">{t("jobs_import_url_card_title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("jobs_import_url_card_hint")}</p>

              <div className="mt-4">
                <input
                  type="text"
                  placeholder={t("jobs_import_url_placeholder")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-navy-950"
                />
              </div>

              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("jobs_import_listing_short")}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">{t("jobs_next_card_title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("jobs_next_card_body")}</p>

              <Link
                href="/jobs/recommendation"
                className="mt-4 inline-flex rounded-xl bg-[#b88a44] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                {t("jobs_go_ai_recommendation")}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}