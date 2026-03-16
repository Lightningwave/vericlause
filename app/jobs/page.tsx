"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

type JobCard = {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  matchScore: number;
  source: string;
  tags: string[];
};

export default function JobDiscoveryPage() {
  const { t } = useLanguage();

  const [jobUrl, setJobUrl] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const jobs: JobCard[] = [
    {
      id: 1,
      title: "Operations Executive",
      company: "NovaEdge Consulting",
      location: "Singapore",
      type: "Full-time",
      salary: "SGD 3,800 - 4,500",
      matchScore: 88,
      source: "MyCareersFuture",
      tags: ["Operations", "Coordination", "Stakeholder Management"],
    },
    {
      id: 2,
      title: "Project Coordinator",
      company: "Vertex Solutions",
      location: "Singapore",
      type: "Full-time",
      salary: "SGD 4,000 - 4,800",
      matchScore: 83,
      source: "MyCareersFuture",
      tags: ["Projects", "Documentation", "Reporting"],
    },
    {
      id: 3,
      title: "Customer Success Associate",
      company: "BlueArc Systems",
      location: "Hybrid",
      type: "Full-time",
      salary: "SGD 3,500 - 4,200",
      matchScore: 76,
      source: "Imported URL",
      tags: ["Client Support", "Communication", "Follow-up"],
    },
    {
      id: 4,
      title: "Business Support Executive",
      company: "Lighthouse Group",
      location: "Singapore",
      type: "Contract",
      salary: "SGD 3,600 - 4,100",
      matchScore: 81,
      source: "MyCareersFuture",
      tags: ["Administration", "Scheduling", "Coordination"],
    },
  ];

  const filteredJobs =
    selectedFilter === "all"
      ? jobs
      : jobs.filter((job) => job.source.toLowerCase().includes(selectedFilter));

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
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
          >
            {t("sign_in")}
          </Link>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-14 md:py-18">
        <section className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-600">
            {t("jobs_badge")}
          </p>
          <h1 className="font-serif text-4xl font-bold text-navy-950 md:text-5xl">
            {t("jobs_title")}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            {t("jobs_description")}
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-2xl font-bold text-navy-950">
                {t("jobs_import_title")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("jobs_import_description")}
              </p>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("jobs_import_label")}
                </label>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://example.com/job-posting"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-navy-300"
                />
              </div>

              <button
                type="button"
                className="mt-4 w-full rounded-md bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-navy-800"
              >
                {t("jobs_import_button")}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("jobs_filter_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("jobs_filter_description")}
              </p>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setSelectedFilter("all")}
                  className={`w-full rounded-md px-4 py-3 text-left text-sm font-medium transition-all ${
                    selectedFilter === "all"
                      ? "bg-navy-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-navy-200 hover:text-navy-950"
                  }`}
                >
                  {t("jobs_filter_all")}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFilter("mycareersfuture")}
                  className={`w-full rounded-md px-4 py-3 text-left text-sm font-medium transition-all ${
                    selectedFilter === "mycareersfuture"
                      ? "bg-navy-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-navy-200 hover:text-navy-950"
                  }`}
                >
                  {t("jobs_filter_mcf")}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFilter("imported")}
                  className={`w-full rounded-md px-4 py-3 text-left text-sm font-medium transition-all ${
                    selectedFilter === "imported"
                      ? "bg-navy-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-navy-200 hover:text-navy-950"
                  }`}
                >
                  {t("jobs_filter_imported")}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="font-serif text-lg font-bold text-emerald-800">
                {t("jobs_tip_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-700">
                {t("jobs_tip_description")}
              </p>
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                  {t("jobs_results_badge")}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
                  {t("jobs_results_title")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {t("jobs_results_description")}
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                {filteredJobs.length} {t("jobs_results_count")}
              </div>
            </div>

            <div className="mt-8 space-y-5">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all hover:border-gold-200 hover:bg-white"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-xl font-bold text-navy-950">
                          {job.title}
                        </h3>
                        <span className="rounded-full bg-gold-50 px-2.5 py-1 text-xs font-semibold text-gold-700">
                          {job.matchScore}% {t("jobs_match_label")}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {job.company}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {job.location}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {job.type}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {job.salary}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {job.source}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {job.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 md:w-[180px]">
                      <button
                        type="button"
                        className="rounded-md bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy-800"
                      >
                        {t("jobs_save_button")}
                      </button>
                      <Link
                        href="/jobs/compare"
                        className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                      >
                        {t("jobs_compare_button")}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-500">
                {t("jobs_footer_note")}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/resume/review"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("jobs_back_resume")}
                </Link>
                <Link
                  href="/jobs/recommendation"
                  className="rounded-md bg-navy-950 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-navy-800"
                >
                  {t("jobs_continue_recommendation")}
                </Link>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}