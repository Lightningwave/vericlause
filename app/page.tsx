"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-white">
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

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              VeriClause
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl lg:text-6xl">
              AI-powered contract and career guidance in one workspace
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Review contracts, compare terms, build resumes, match jobs, and practise interviews
              with a multilingual AI-assisted experience.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
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
                <p className="text-sm font-medium text-slate-500">Contracts</p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">Analyze and compare</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Identify risky clauses, benchmark terms, and compare multiple contracts.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">Career</p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">Build and improve</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Upload resumes, use voice-based resume creation, and get job recommendations.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">Interview</p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">Practise with AI</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Train with an AI interviewer and prepare for real interview scenarios.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">Languages</p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">Multilingual support</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Designed for English, Chinese, Malay, and Tamil experiences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              Features
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-navy-950 sm:text-4xl">
              Built for contract clarity and career growth
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              VeriClause combines contract intelligence and career assistance in one frontend
              experience, making it easier for users to review documents and prepare professionally.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-navy-950">Contract Analysis</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Review clauses, identify issues, and view AI insights on one page.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-navy-950">Contract Comparison</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Compare multiple contracts with AI summaries, terms, and clause differences.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-navy-950">Resume & Jobs</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Build resumes, review content, and match to suitable roles.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-navy-950">AI Interview Agent</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Practise interview responses with an avatar-based AI stage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              How it works
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-navy-950 sm:text-4xl">
              A guided AI workflow
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-semibold text-[#b88a44]">01</div>
              <h3 className="mt-3 text-lg font-semibold text-navy-950">Upload or start</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Choose a contract, resume, or interview path based on what you want to do.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-semibold text-[#b88a44]">02</div>
              <h3 className="mt-3 text-lg font-semibold text-navy-950">Review AI output</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                See analysis, recommendations, and coaching directly in the same workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-semibold text-[#b88a44]">03</div>
              <h3 className="mt-3 text-lg font-semibold text-navy-950">Take action</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Refine documents, compare decisions, and prepare for interviews with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            FAQ
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-navy-950 sm:text-4xl">
            Common questions
          </h2>

          <div className="mt-10 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-navy-950">
                Can I use VeriClause for both contracts and career preparation?
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Yes. The platform is designed to support both contract review and career workflows.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-navy-950">
                Does the platform support multiple languages?
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Yes. The UI supports multiple languages, and AI outputs can follow the selected locale.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-navy-950">
                Can users speak instead of typing?
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Yes. A voice resume flow is included, and the interview experience is being prepared for deeper voice integration.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}