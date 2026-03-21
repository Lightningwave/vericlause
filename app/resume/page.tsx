"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

export default function ResumePage() {
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
            {t("nav_resume")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            Resume Upload
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            Upload your resume to begin AI review, editing, and job matching.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-navy-950">Upload Resume</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Start by uploading your existing resume. You can also continue with voice resume input if needed.
            </p>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = "/resume/review";
              }}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-navy-700 hover:file:bg-navy-100"
              />

              <button
                type="submit"
                className="mt-4 w-full rounded-xl bg-navy-950 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Go to Resume Review
              </button>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">Alternative Option</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Users who are less comfortable typing can create their resume through guided voice input.
              </p>

              <Link
                href="/resume/voice"
                className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("nav_voice_resume")}
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">What happens next</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>• Resume Review: AI checks strengths and improvements.</p>
                <p>• Resume Builder: edit and refine resume sections.</p>
                <p>• Job Matching: compare your resume against suitable roles.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}