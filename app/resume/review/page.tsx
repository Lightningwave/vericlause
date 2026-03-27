"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";
import { useResumeStatus } from "@/components/providers/resume-status-provider";
import { createClient } from "@/lib/supabase/client";
import {
  getProfileJob,
  getResumeById,
  isApiUnauthorizedError,
  listResumes,
  profileResume,
} from "@/lib/api";
import type { ResumeProfile, ResumeSuggestion } from "@/lib/types";

function formatExperiencesText(profile: ResumeProfile): string {
  if (!profile.experiences?.length) return "";
  return profile.experiences
    .map((e) => {
      const header = [e.title, e.company].filter(Boolean).join(" — ");
      const dates = [e.start_date, e.end_date].filter(Boolean).join(" – ");
      const lines = [header, dates, e.description].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");
}

function formatEducationText(profile: ResumeProfile): string {
  if (!profile.education?.length) return "";
  return profile.education
    .map((ed) =>
      [ed.qualification, ed.institution, ed.field_of_study, ed.graduation_year != null ? String(ed.graduation_year) : null]
        .filter(Boolean)
        .join(" • "),
    )
    .join("\n");
}

function deriveIndicatorScore(suggestions: ResumeSuggestion[] | null | undefined): number {
  if (!suggestions?.length) return 78;
  let penalty = 0;
  for (const s of suggestions) {
    if (s.type === "critical_fix") penalty += 14;
    else if (s.priority === "high") penalty += 10;
    else if (s.priority === "medium") penalty += 5;
    else penalty += 2;
  }
  return Math.max(42, Math.min(96, Math.round(96 - penalty)));
}

function splitSuggestions(suggestions: ResumeSuggestion[] | null | undefined): {
  toImprove: ResumeSuggestion[];
  positiveHints: ResumeSuggestion[];
} {
  if (!suggestions?.length) return { toImprove: [], positiveHints: [] };
  /** Layout/visual feedback from vision + text — must be included; was missing and never appeared in sidebar columns */
  const toImprove = suggestions.filter(
    (s) =>
      s.type === "critical_fix" ||
      s.priority === "high" ||
      s.type === "content_gap" ||
      s.type === "design_feedback",
  );
  const positiveHints = suggestions.filter(
    (s) => s.type === "enhancement" || s.type === "impact_opportunity" || s.type === "ats_optimization",
  );
  return {
    toImprove: toImprove.length ? toImprove : suggestions.slice(0, Math.min(5, suggestions.length)),
    positiveHints: positiveHints.length ? positiveHints.slice(0, 5) : [],
  };
}

const SUGGESTION_TYPE_LABEL: Record<ResumeSuggestion["type"], string> = {
  critical_fix: "Critical",
  enhancement: "Enhancement",
  design_feedback: "Design",
  content_gap: "Content gap",
  impact_opportunity: "Impact",
  ats_optimization: "ATS",
};

function ResumeReviewContent() {
  const { t } = useLanguage();
  const { refetch: refetchResumeStatus } = useResumeStatus();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiling, setProfiling] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [suggestions, setSuggestions] = useState<ResumeSuggestion[] | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);

  const loadResume = useCallback(async (id: string) => {
    try {
      const data = await getResumeById(id);
      if (!data?.resume) {
        setError("Resume not found or you don’t have access.");
        setProfile(null);
        setSuggestions(null);
        setFileName(null);
        setResumeId(null);
        return;
      }
      setResumeId(data.resume.id);
      setFileName(data.resume.file_name);
      setProfile(data.resume.parsed_profile);
      setSuggestions(data.resume.ai_suggestions);
      if (!data.resume.parsed_profile) {
        setError(
          "This resume has not been analyzed yet. Use “Run AI analysis” below, or upload again from the resume page.",
        );
      } else {
        setError(null);
      }
    } catch (e) {
      if (isApiUnauthorizedError(e)) {
        router.replace("/auth/sign-in?next=/resume/review");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to load resume.");
      setProfile(null);
      setSuggestions(null);
      setFileName(null);
      setResumeId(null);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          router.replace("/auth/sign-in?next=/resume/review");
        }
        return;
      }

      const fromQuery = searchParams.get("resume_id");
      let id = fromQuery;

      if (!id && typeof window !== "undefined") {
        try {
          id = sessionStorage.getItem("vericlause.lastResumeId");
        } catch {
          id = null;
        }
      }

      if (!id) {
        try {
          const listed = await listResumes();
          const withProfile = listed.resumes.find((r) => r.parsed_profile);
          id = withProfile?.id ?? listed.resumes[0]?.id ?? null;
        } catch (e) {
          if (!cancelled && isApiUnauthorizedError(e)) {
            router.replace("/auth/sign-in?next=/resume/review");
          }
          if (!cancelled) setLoading(false);
          return;
        }
      }

      if (!id) {
        if (!cancelled) {
          setError("No resume yet. Upload one from the resume page first.");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) await loadResume(id);
      if (!cancelled) setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams, loadResume]);

  async function handleRunAnalysis() {
    if (!resumeId) return;
    setProfiling(true);
    setError(null);
    try {
      const started = await profileResume(resumeId);
      if (started.status === "succeeded" && started.profile) {
        setProfile(started.profile);
        setSuggestions(started.suggestions ?? null);
        setError(null);
        return;
      }
      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        const { job, resume } = await getProfileJob(started.job_id);
        if (job.status === "succeeded") {
          if (resume?.parsed_profile) {
            setProfile(resume.parsed_profile);
            setSuggestions(resume.ai_suggestions ?? null);
            setError(null);
            return;
          }
          await loadResume(resumeId);
          setError(null);
          return;
        }
        if (job.status === "failed") {
          throw new Error(job.error ?? "Analysis failed");
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      await loadResume(resumeId);
    } catch (e) {
      if (isApiUnauthorizedError(e)) {
        router.replace("/auth/sign-in?next=/resume/review");
        return;
      }
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setProfiling(false);
      void refetchResumeStatus();
    }
  }

  const score = deriveIndicatorScore(suggestions);
  const { toImprove, positiveHints } = splitSuggestions(suggestions);

  const strengthsDisplay =
    positiveHints.length > 0
      ? positiveHints.map((s) => s.suggestion)
      : profile?.skills?.length
        ? profile.skills.slice(0, 6)
        : [t("resume_review_strength_1"), t("resume_review_strength_2"), t("resume_review_strength_3")];

  const improvementsDisplay =
    toImprove.length > 0
      ? toImprove.map((s) => s.suggestion)
      : suggestions?.length
        ? suggestions.slice(0, 5).map((s) => s.suggestion)
        : [t("resume_review_improvement_1"), t("resume_review_improvement_2"), t("resume_review_improvement_3")];

  const keywordChips = [
    ...(profile?.skills ?? []),
    ...(profile?.target_roles ?? []).slice(0, 4),
  ].slice(0, 12);

  const summaryValue = profile?.summary ?? "";
  const experienceValue = profile ? formatExperiencesText(profile) : "";
  const skillsValue = profile?.skills?.length ? profile.skills.join(", ") : "";
  const educationValue = profile ? formatEducationText(profile) : "";

  return (
    <div className="min-h-screen bg-white">
      <SiteNavbar
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
          {fileName ? (
            <p className="mt-3 text-sm text-slate-500">
              File: <span className="font-medium text-slate-700">{fileName}</span>
            </p>
          ) : null}
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <p>{error}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {resumeId ? (
                <button
                  type="button"
                  disabled={profiling}
                  onClick={handleRunAnalysis}
                  className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {profiling ? "Analyzing…" : "Run AI analysis"}
                </button>
              ) : null}
              <Link
                href="/resume"
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Upload resume
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && profile ? (
        <section
          id="review"
          className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]"
        >
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("resume_review_score_label")}
                  </p>
                  <h2 className="mt-2 font-serif text-4xl font-bold text-navy-950">
                    {score}
                    <span className="ml-1 text-xl text-slate-400">/100</span>
                  </h2>
                </div>
                <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {t("resume_review_score_status")}
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gold-500"
                  style={{ width: `${score}%` }}
                />
              </div>

              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                Indicative score from AI suggestion count/priority — not a hiring decision.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("resume_review_score_note")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("resume_review_strengths_title")}
              </h3>
              <ul className="mt-4 space-y-3">
                {strengthsDisplay.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
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
                {improvementsDisplay.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
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
                {(keywordChips.length ? keywordChips : ["—"]).map((keyword) => (
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

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                  {t("resume_review_editor_badge")}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
                  {profile.headline ?? t("resume_review_editor_title")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {t("resume_review_editor_description")}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={profiling || !resumeId}
                  onClick={handleRunAnalysis}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950 disabled:opacity-50"
                >
                  {profiling ? "Re-analyzing…" : t("resume_review_apply_ai")}
                </button>
                <Link
                  href="/resume"
                  className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-navy-800"
                >
                  {t("resume_review_generate_new")}
                </Link>
              </div>
            </div>

            {suggestions && suggestions.length > 0 ? (
              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Detailed AI suggestions
                </p>
                <ul className="mt-3 space-y-3">
                  {suggestions.map((s, i) => (
                    <li key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      <span className="font-medium text-navy-950">
                        [{SUGGESTION_TYPE_LABEL[s.type] ?? s.type}] {s.priority}
                      </span>
                      : {s.suggestion}
                      {s.suggested_rewrite ? (
                        <p className="mt-2 text-xs text-slate-600">
                          <span className="font-semibold">Suggestion:</span> {s.suggested_rewrite}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_summary")}
                </label>
                <textarea
                  rows={5}
                  readOnly
                  value={summaryValue}
                  placeholder="No summary extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_experience")}
                </label>
                <textarea
                  rows={8}
                  readOnly
                  value={experienceValue}
                  placeholder="No experience extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none whitespace-pre-wrap"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_skills")}
                </label>
                <textarea
                  rows={4}
                  readOnly
                  value={skillsValue}
                  placeholder="No skills extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_education")}
                </label>
                <textarea
                  rows={3}
                  readOnly
                  value={educationValue}
                  placeholder="No education extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none whitespace-pre-wrap"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-400"
                >
                  {t("resume_review_download_pdf")}
                </button>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-400"
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
        ) : null}

        {!loading && !profile && !error ? (
          <p className="py-12 text-center text-slate-600">
            No analyzed profile loaded.{" "}
            <Link href="/resume" className="font-medium text-navy-950 underline">
              Upload a resume
            </Link>
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default function ResumeReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
          </div>
        </div>
      }
    >
      <ResumeReviewContent />
    </Suspense>
  );
}
