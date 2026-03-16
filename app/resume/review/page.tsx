"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

export default function ResumeReviewPage() {
  const { t } = useLanguage();

  const strengths = [
    t("resume_review_strength_1"),
    t("resume_review_strength_2"),
    t("resume_review_strength_3"),
  ];

  const improvements = [
    t("resume_review_improvement_1"),
    t("resume_review_improvement_2"),
    t("resume_review_improvement_3"),
  ];

  const missingKeywords = [
    "Stakeholder Management",
    "Project Coordination",
    "Data Analysis",
    "Presentation Skills",
  ];

  return (
    <div className="min-h-screen bg-white">
      <SiteNavbar
        links={[
          { href: "/", label: "nav_home" },
          { href: "/resume", label: "nav_resume" },
          { href: "#review", label: "resume_review_nav" },
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
            {t("resume_review_badge")}
          </p>
          <h1 className="font-serif text-4xl font-bold text-navy-950 md:text-5xl">
            {t("resume_review_title")}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            {t("resume_review_description")}
          </p>
        </section>

        <section
          id="review"
          className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]"
        >
          {/* Left panel */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("resume_review_score_label")}
                  </p>
                  <h2 className="mt-2 font-serif text-4xl font-bold text-navy-950">
                    78
                    <span className="ml-1 text-xl text-slate-400">/100</span>
                  </h2>
                </div>
                <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {t("resume_review_score_status")}
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[78%] rounded-full bg-gold-500" />
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {t("resume_review_score_note")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("resume_review_strengths_title")}
              </h3>
              <ul className="mt-4 space-y-3">
                {strengths.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("resume_review_improvements_title")}
              </h3>
              <ul className="mt-4 space-y-3">
                {improvements.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700">
                      !
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("resume_review_keywords_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("resume_review_keywords_description")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {missingKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          {/* Right panel */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                  {t("resume_review_editor_badge")}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
                  {t("resume_review_editor_title")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {t("resume_review_editor_description")}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_review_apply_ai")}
                </button>
                <button
                  type="button"
                  className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-navy-800"
                >
                  {t("resume_review_generate_new")}
                </button>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_summary")}
                </label>
                <textarea
                  rows={5}
                  defaultValue="Detail-oriented professional with experience in operations support, client communication, and cross-functional coordination. Strong ability to manage timelines, documentation, and stakeholder follow-up."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-navy-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_experience")}
                </label>
                <textarea
                  rows={8}
                  defaultValue={`Operations Executive
- Managed internal documentation and tracked project deliverables across teams.
- Supported communication between internal stakeholders and external clients.
- Prepared reports, scheduling updates, and administrative coordination.

Customer Support Associate
- Responded to client inquiries and resolved service issues.
- Maintained records and followed up on outstanding cases.`}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-navy-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_skills")}
                </label>
                <textarea
                  rows={4}
                  defaultValue="Communication, Microsoft Office, Project Coordination, Client Support, Documentation, Reporting"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-navy-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_education")}
                </label>
                <textarea
                  rows={3}
                  defaultValue="Diploma in Business Administration"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-navy-300"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_review_download_pdf")}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_review_download_docx")}
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/resume"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_review_back")}
                </Link>
                <Link
                  href="/resume/builder"
                  className="rounded-md bg-navy-950 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-navy-800"
                >
                  {t("resume_review_edit_builder")}
                </Link>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}