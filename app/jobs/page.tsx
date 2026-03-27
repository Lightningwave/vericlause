"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  Sparkles,
  Upload,
} from "lucide-react";
import { SiteNavbar } from "@/components/SiteNavbar";
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
  const [selectedJobId, setSelectedJobId] = useState<string>(mockJobs[0]?.id ?? "");
  const [resumeFileName, setResumeFileName] = useState<string>("");

  const selectedJob = useMemo(
    () => mockJobs.find((job) => job.id === selectedJobId) ?? mockJobs[0],
    [selectedJobId],
  );

  function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name);
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={
          <Link
            href="/dashboard"
            className="rounded-md bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("nav_dashboard")}
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
                {t("jobs_nav")}
              </p>
              <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
                {t("jobs_title")}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                {t("jobs_description")}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-navy-950">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-semibold">{t("jobs_step_1_title")}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("jobs_step_1_description")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-navy-950">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-sm font-semibold">{t("jobs_step_2_title")}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("jobs_step_2_description")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-navy-950">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-semibold">{t("jobs_step_3_title")}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("jobs_step_3_description")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-navy-950 p-6 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8b06a]">
                {t("jobs_ai_card_badge")}
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                {t("jobs_ai_card_title")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                {t("jobs_ai_card_description")}
              </p>

              <div className="mt-6 space-y-3 rounded-2xl bg-white/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#d8b06a]" />
                  <p className="text-sm text-slate-100">{t("jobs_ai_card_point_1")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#d8b06a]" />
                  <p className="text-sm text-slate-100">{t("jobs_ai_card_point_2")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#d8b06a]" />
                  <p className="text-sm text-slate-100">{t("jobs_ai_card_point_3")}</p>
                </div>
              </div>

              <Link
                href="/jobs/recommendation"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#b88a44] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {t("jobs_primary_cta")}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="mt-3 text-center text-xs text-slate-300">
                {t("jobs_primary_cta_hint")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-navy-950">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-navy-950">
                    {t("jobs_resume_title")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("jobs_resume_description")}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy-950">
                      {t("jobs_resume_upload_label")}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {resumeFileName
                        ? `${t("jobs_resume_selected")}: ${resumeFileName}`
                        : t("jobs_resume_supported_formats")}
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-950 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90">
                    <Upload className="h-4 w-4" />
                    {t("jobs_resume_upload_button")}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleResumeUpload}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-navy-950">
                    {t("jobs_roles_title")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("jobs_roles_description")}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {mockJobs.map((job) => {
                  const isSelected = selectedJobId === job.id;

                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      className={[
                        "w-full rounded-2xl border p-5 text-left transition",
                        isSelected
                          ? "border-navy-950 bg-navy-950 text-white shadow-md"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{job.title}</h3>
                            {isSelected ? (
                              <span className="rounded-full bg-[#b88a44] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                                {t("jobs_selected_badge")}
                              </span>
                            ) : null}
                          </div>

                          <p
                            className={[
                              "mt-1 text-sm font-medium",
                              isSelected ? "text-slate-200" : "text-slate-700",
                            ].join(" ")}
                          >
                            {job.company}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={[
                              "rounded-full px-3 py-1 text-xs font-medium",
                              isSelected
                                ? "bg-white/10 text-slate-100"
                                : "bg-white text-slate-600",
                            ].join(" ")}
                          >
                            {job.location}
                          </span>
                          <span
                            className={[
                              "rounded-full px-3 py-1 text-xs font-medium",
                              isSelected
                                ? "bg-white/10 text-slate-100"
                                : "bg-white text-slate-600",
                            ].join(" ")}
                          >
                            {job.type}
                          </span>
                        </div>
                      </div>

                      <p
                        className={[
                          "mt-4 text-sm leading-6",
                          isSelected ? "text-slate-100" : "text-slate-600",
                        ].join(" ")}
                      >
                        {job.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">
                {t("jobs_selected_role_title")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("jobs_selected_role_description")}
              </p>

              {selectedJob ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-navy-950">{selectedJob.title}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {selectedJob.company}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {selectedJob.location}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {selectedJob.type}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {selectedJob.summary}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">
                {t("jobs_import_title")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("jobs_import_description")}
              </p>

              <div className="mt-4">
                <input
                  type="text"
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-navy-950"
                />
              </div>

              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("jobs_import_button")}
              </button>
            </div>

            <div className="rounded-2xl border border-[#d9b06b] bg-[#fff9f1] p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
                {t("jobs_next_step_badge")}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-navy-950">
                {t("jobs_next_step_title")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {t("jobs_next_step_description")}
              </p>

              <div className="mt-4 rounded-2xl border border-[#ecd6ae] bg-white p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#b88a44]" />
                  <p className="text-sm leading-6 text-slate-700">
                    {t("jobs_next_step_tip")}
                  </p>
                </div>
              </div>

              <Link
                href="/jobs/recommendation"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#b88a44] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {t("jobs_primary_cta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}