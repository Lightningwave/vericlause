"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

type Recommendation = {
  title: string;
  company: string;
  matchScore: number;
  strengths: string[];
  improvements: string[];
  reasoning: string;
  applyUrl: string;
};

const mockRecommendation: Recommendation = {
  title: "Operations Executive",
  company: "Inter Group",
  matchScore: 88,
  strengths: [
    "Your coordination and documentation experience align well with this role.",
    "Your communication background supports stakeholder and internal team follow-up.",
    "Your profile shows transferable operational support capabilities.",
  ],
  improvements: [
    "Add more measurable achievements to your resume.",
    "Highlight specific tools or systems you have used.",
    "Strengthen your professional summary around operations impact.",
  ],
  reasoning:
    "This role appears to be the strongest fit based on your coordination, administration, and support experience. Your background aligns well with process support and day-to-day operational responsibilities.",
  applyUrl: "https://example.com/job/operations-executive",
};

export default function JobRecommendationPage() {
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
            {t("nav_recommendation")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            AI Job Recommendation
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            Review the strongest role match, why it fits, and what to improve before applying.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{mockRecommendation.company}</p>
                <h2 className="mt-1 text-3xl font-semibold text-navy-950">
                  {mockRecommendation.title}
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Match Score
                </p>
                <p className="mt-2 text-3xl font-semibold text-navy-950">
                  {mockRecommendation.matchScore}%
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Why this role matches
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {mockRecommendation.reasoning}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Strengths
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-emerald-900">
                  {mockRecommendation.strengths.map((item) => (
                    <p key={item}>• {item}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Improvements
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-amber-900">
                  {mockRecommendation.improvements.map((item) => (
                    <p key={item}>• {item}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">Apply or Continue</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                You can proceed to the job posting or continue preparing for interviews.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <a
                  href={mockRecommendation.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-navy-950 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Open Job Listing
                </a>

                <Link
                  href="/interview"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Continue to Interview Prep
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">Recommendation Notes</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This page is ready for AI response integration later. When connected to backend,
                the strengths, improvement points, and reasoning can be rendered directly from AI output.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}