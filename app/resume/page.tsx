"use client";

import { useState } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";
import type { ResumeFeedback } from "@/app/api/resume/route";

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ResumeFeedback | null>(null);

  async function handleAnalyse() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setError(json.detail ?? "Something went wrong. Please try again.");
        return;
      }

      setFeedback(json.feedback as ResumeFeedback);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <SiteNavbar
        links={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "Dashboard" },
          { href: "/compare", label: "Compare" },
          { href: "/resume", label: "Resume" },
        ]}
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="max-w-xl mx-auto">
          <h1 className="font-serif text-2xl font-bold text-navy-950 mb-2">
            Upload Your Resume
          </h1>
          <p className="text-slate-600 mb-8">
            Get AI-powered feedback on your resume instantly.
          </p>

          {/* Upload card */}
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm mb-6">
            <div className="mb-6 text-center">
              <div className="mx-auto h-12 w-12 text-navy-300 mb-3">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="font-medium text-navy-900">Upload Resume</h3>
              <p className="text-sm text-slate-500 mt-1">PDF or DOCX, maximum 10MB.</p>
            </div>

            <div className="mb-4">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-navy-50 file:text-navy-700
                  hover:file:bg-navy-100 cursor-pointer"
              />
              {file && (
                <p className="mt-2 text-xs text-slate-500">
                  Selected: <span className="font-medium text-slate-700">{file.name}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleAnalyse}
              disabled={!file || loading}
              className="w-full rounded-md bg-navy-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-navy-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Analysing..." : "Analyse My Resume"}
            </button>

            {error && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                {error}
              </p>
            )}
          </div>

          {/* AI feedback */}
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-serif text-lg font-semibold text-navy-950">
                AI Feedback
              </h2>
              {feedback && (
                <span className="text-sm font-semibold text-navy-950">
                  Score: <span className="text-xl">{feedback.score}</span>
                  <span className="text-slate-400 font-normal"> / 10</span>
                </span>
              )}
            </div>

            {!feedback ? (
              <>
                <p className="text-sm text-slate-500 mb-6">
                  Your resume analysis will appear here once you upload a file and click Analyse.
                </p>
                <div className="space-y-3">
                  {["Overall Impression", "Key Strengths", "Areas to Improve", "Suggested Edits"].map((section) => (
                    <div key={section} className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{section}</p>
                      <div className="mt-2 h-3 w-3/4 rounded bg-slate-200" />
                      <div className="mt-1.5 h-3 w-1/2 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4 mt-4">
                <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Overall Impression
                  </p>
                  <p className="text-sm text-slate-700">{feedback.overallImpression}</p>
                </div>

                <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Key Strengths
                  </p>
                  <ul className="space-y-1.5">
                    {feedback.keyStrengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Areas to Improve
                  </p>
                  <ul className="space-y-1.5">
                    {feedback.areasToImprove.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Suggested Edits
                  </p>
                  <ul className="space-y-1.5">
                    {feedback.suggestedEdits.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
