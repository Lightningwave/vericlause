"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { useLanguage } from "@/components/providers/language-provider";
import { usePlan } from "@/hooks/use-plan";
import type { JobRecommendation, ScrapedJob } from "@/lib/services/jobRecommendation";

type Tab = "recommendations" | "scrape";

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "Salary not stated";
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()} / month`;
  if (min) return `From $${min.toLocaleString()} / month`;
  return `Up to $${max!.toLocaleString()} / month`;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
      : score >= 60
        ? "text-amber-700 bg-amber-50 border-amber-100"
        : "text-slate-600 bg-slate-50 border-slate-200";

  return (
    <div className={`rounded-2xl border px-5 py-4 text-center ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Match</p>
      <p className="mt-1 text-3xl font-semibold">{score}%</p>
    </div>
  );
}

function JobCard({
  job,
  selected,
  onClick,
}: {
  job: JobRecommendation;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition hover:shadow-md ${
        selected
          ? "border-navy-950 bg-navy-950 text-white shadow-md"
          : "border-slate-200 bg-white text-navy-950"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-medium ${selected ? "text-slate-300" : "text-slate-500"}`}>
            {job.company} · {job.source}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{job.title}</p>
          <p className={`mt-1 text-xs ${selected ? "text-slate-300" : "text-slate-400"}`}>
            {formatSalary(job.salaryMin, job.salaryMax)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-xl px-2 py-1 text-xs font-semibold ${
            selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {job.matchScore}%
        </span>
      </div>
    </button>
  );
}

function RecommendationsTab({ t }: { t: (key: string) => string }) {
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [selected, setSelected] = useState<JobRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/jobs/recommend");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load recommendations");
        setJobs(data.recommendations ?? []);
        if (data.recommendations?.length) setSelected(data.recommendations[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-navy-950" />
        <p className="text-sm">Finding your best job matches…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">
        {error}
        {error.includes("resume") && (
          <div className="mt-4">
            <Link
              href="/resume"
              className="inline-flex items-center rounded-xl bg-navy-950 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Upload Resume →
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        <p className="text-sm">No matching jobs found. Try updating your resume profile.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          {jobs.length} matches found
        </p>
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            selected={selected?.id === job.id}
            onClick={() => setSelected(job)}
          />
        ))}
      </div>

      {selected && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">{selected.company}</p>
              <h2 className="mt-1 text-2xl font-semibold text-navy-950">{selected.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatSalary(selected.salaryMin, selected.salaryMax)}
                {selected.employmentType && ` · ${selected.employmentType}`}
              </p>
            </div>
            <ScoreBadge score={selected.matchScore} />
          </div>

          {selected.skills.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {selected.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Why this matches you
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{selected.reasoning}</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Your Strengths
              </p>
              <div className="mt-4 space-y-2 text-sm leading-6 text-emerald-900">
                {selected.strengths.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                To Improve
              </p>
              <div className="mt-4 space-y-2 text-sm leading-6 text-amber-900">
                {selected.improvements.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={selected.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-navy-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              View on {selected.source} →
            </a>
            <Link
              href="/interview"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Practice Interview
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function ScrapeTab() {
  const [url, setUrl] = useState("");
  const [job, setJob] = useState<ScrapedJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setJob(null);

    try {
      const res = await fetch("/api/jobs/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to extract job");
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-950">Extract Job from URL</h2>
        <p className="mt-1 text-sm text-slate-500">
          Paste any job posting URL — LinkedIn, JobStreet, Indeed, MyCareersFuture, or any other job board.
        </p>

        <div className="mt-5 flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.mycareersfuture.gov.sg/job/..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-navy-950 focus:ring-2 focus:ring-navy-950/10"
          />
          <button
            type="button"
            onClick={handleExtract}
            disabled={loading || !url.trim()}
            className="rounded-xl bg-navy-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Extracting…" : "Extract"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {job && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400">{job.source}</p>
              <h2 className="mt-1 text-2xl font-semibold text-navy-950">
                {job.title ?? "Untitled Role"}
              </h2>
              {job.company && (
                <p className="mt-0.5 text-sm font-medium text-slate-500">{job.company}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
            {job.salary && <span>💰 {job.salary}</span>}
            {job.location && <span>📍 {job.location}</span>}
            {job.employmentType && <span>🕐 {job.employmentType}</span>}
          </div>

          {job.skills.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Key Skills
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.description && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Description
              </p>
              <div
                className="mt-3 text-sm leading-7 text-slate-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: job.description.slice(0, 3000) }}
              />
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-navy-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              View Original Posting →
            </a>
            <Link
              href="/interview"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Practice Interview
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("recommendations");
  const { plan, loading: planLoading } = usePlan();

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={<UserMenu />}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            {t("nav_recommendation")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            {t("jobs_recommendation_page_title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            {t("jobs_recommendation_page_lead")}
          </p>
        </div>

        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit shadow-sm">
          <button
            onClick={() => setTab("recommendations")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              tab === "recommendations"
                ? "bg-navy-950 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            AI Recommendations
          </button>
          <button
            onClick={() => setTab("scrape")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              tab === "scrape"
                ? "bg-navy-950 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Extract from URL
          </button>
        </div>

        {tab === "recommendations" ? (
          planLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              Loading…
            </div>
          ) : plan?.key !== "pro" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-sm font-semibold text-amber-900">
                Job matching is available on Pro.
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Upgrade your plan to start matching jobs with your resume.
              </p>
              <div className="mt-4 flex justify-center">
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-xl bg-navy-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Go to Profile →
                </Link>
              </div>
            </div>
          ) : (
            <RecommendationsTab t={t} />
          )
        ) : (
          <ScrapeTab />
        )}
      </section>
    </main>
  );
}