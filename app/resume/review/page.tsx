"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

const mockReview = {
  score: 82,
  strengths: [
    "Clear overall structure",
    "Readable language and formatting",
    "Relevant coordination and support experience",
  ],
  improvements: [
    "Add more quantified achievements",
    "Strengthen professional summary",
    "Include more role-specific keywords",
  ],
  missingKeywords: ["Stakeholder Management", "Project Coordination", "Reporting"],
};

export default function ResumeReviewPage() {
  const { t } = useLanguage();

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
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            {t("nav_resume_review")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            Resume Review
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            Review your current resume quality and identify what to improve before editing or job matching.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Resume Score
              </p>
              <p className="mt-3 text-5xl font-semibold text-navy-950">{mockReview.score}/100</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-emerald-900">Strengths</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-emerald-900">
                {mockReview.strengths.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-amber-900">Improvements</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-amber-900">
                {mockReview.improvements.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">Missing Keywords</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {mockReview.missingKeywords.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">Next Step</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Continue to the builder to refine your resume using the review insights above.
              </p>

              <Link
                href="/resume/builder"
                className="mt-4 inline-flex rounded-xl bg-navy-950 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                {t("nav_resume_builder")}
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">What this page will do later</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This page is ready for AI integration later. Score, strengths, improvements, and keyword gaps
                can be rendered directly from your backend response.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}