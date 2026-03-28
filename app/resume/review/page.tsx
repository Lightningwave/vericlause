"use client";

import React from "react";
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

function parseImprovedResume(text: string): {
  summary: string | null;
  experience: string | null;
  skills: string | null;
  education: string | null;
} {
  // Strip **bold** markdown markers from AI output
  const cleaned = text.replace(/\*\*/g, "");

  function extractSection(label: string): string | null {
    const regex = new RegExp(
      `${label}[:\\s]*\\n([\\s\\S]*?)(?=\\n[A-Z][A-Za-z ]{2,}[:\\n]|$)`,
      "i",
    );
    const match = cleaned.match(regex);
    return match?.[1]?.trim() || null;
  }

  const summary = extractSection("Summary") || extractSection("Professional Summary");
  const experience = extractSection("Experience") || extractSection("Work Experience");
  const skills = extractSection("Skills") || extractSection("Key Skills");
  const education = extractSection("Education");

  // Fallback: if no sections parsed, put entire text into experience
  if (!summary && !experience && !skills && !education) {
    return { summary: null, experience: text.trim(), skills: null, education: null };
  }

  return { summary, experience, skills, education };
}

function extractCandidateName(rawText: string, fileName: string): string {
  const firstMeaningfulLine = rawText.split("\n").find((line) => {
    const trimmed = line.trim();
    return (
      trimmed.length > 0 &&
      trimmed.length < 60 &&
      !/[@\d+()[\]]|Summary|Experience|Skills|Education|Name:|Target/i.test(trimmed)
    );
  });
  if (firstMeaningfulLine) return firstMeaningfulLine.trim();
  // Fallback: "John Doe - Voice Resume" → "John Doe"
  const fromFileName = fileName.split(" - ")[0].trim();
  return fromFileName || "Resume";
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
  const [rawText, setRawText] = useState<string>("");
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [suggestions, setSuggestions] = useState<ResumeSuggestion[] | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);

  // Editable override states
  const [summaryOverride, setSummaryOverride] = useState<string | null>(null);
  const [experienceOverride, setExperienceOverride] = useState<string | null>(null);
  const [skillsOverride, setSkillsOverride] = useState<string | null>(null);
  const [educationOverride, setEducationOverride] = useState<string | null>(null);

  // Improve / rescore states
  const [improving, setImproving] = useState(false);
  const [improvedText, setImprovedText] = useState<string | null>(null);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreScore, setRescoreScore] = useState<number | null>(null);
  const [rescoreError, setRescoreError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadResume = useCallback(async (id: string) => {
    try {
      const data = await getResumeById(id);
      if (!data?.resume) {
        setError("Resume not found or you don't have access.");
        setProfile(null);
        setSuggestions(null);
        setFileName(null);
        setResumeId(null);
        return;
      }
      setResumeId(data.resume.id);
      setFileName(data.resume.file_name);
      setRawText(data.resume.raw_text ?? "");
      setProfile(data.resume.parsed_profile);
      setSuggestions(data.resume.ai_suggestions);
      // Reset overrides when loading a new resume
      setSummaryOverride(null);
      setExperienceOverride(null);
      setSkillsOverride(null);
      setEducationOverride(null);
      setRescoreScore(null);
      setImprovedText(null);
      if (!data.resume.parsed_profile) {
        setError(
          "This resume has not been analyzed yet. Use \"Run AI analysis\" below, or upload again from the resume page.",
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

  async function handleGenerateImproved() {
    setImproving(true);
    setImproveError(null);
    try {
      const resumeText = [
        summaryDisplay ? `Summary:\n${summaryDisplay}` : "",
        experienceDisplay ? `Experience:\n${experienceDisplay}` : "",
        skillsDisplay ? `Skills:\n${skillsDisplay}` : "",
        educationDisplay ? `Education:\n${educationDisplay}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const feedbackList = suggestions?.map((s) => s.suggestion) ?? [];

      const res = await fetch("/api/resume/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, feedback: feedbackList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Improvement failed");
      setImprovedText(data.improvedResume);
    } catch (e) {
      setImproveError(e instanceof Error ? e.message : "Improvement failed");
    } finally {
      setImproving(false);
    }
  }

  function handleApplyImproved() {
    if (!improvedText) return;
    const parsed = parseImprovedResume(improvedText);
    if (parsed.summary) setSummaryOverride(parsed.summary);
    if (parsed.experience) setExperienceOverride(parsed.experience);
    if (parsed.skills) setSkillsOverride(parsed.skills);
    if (parsed.education) setEducationOverride(parsed.education);
    setImprovedText(null);
  }

  async function handleRescore() {
    setRescoring(true);
    setRescoreError(null);
    try {
      const resumeText = [summaryDisplay, experienceDisplay, skillsDisplay, educationDisplay]
        .filter(Boolean)
        .join("\n\n");
      const res = await fetch("/api/resume/rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: resumeText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Rescore failed");
      // score is 1–10, scale to 0–100 for display
      setRescoreScore(Math.round(data.score * 10));
    } catch (e) {
      setRescoreError(e instanceof Error ? e.message : "Rescore failed");
    } finally {
      setRescoring(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

      const styles = StyleSheet.create({
        page: { padding: 56.7, fontFamily: "Helvetica" },
        name: { fontSize: 18, marginBottom: 4 },
        contact: { fontSize: 9, color: "#888888", marginBottom: 8 },
        divider: { borderBottomWidth: 1, borderBottomColor: "#dddddd", borderBottomStyle: "solid", marginBottom: 12 },
        sectionHeader: { fontSize: 11, fontWeight: "bold", marginBottom: 6, marginTop: 10 },
        body: { fontSize: 10, lineHeight: 1.5, marginBottom: 4 },
        bullet: { fontSize: 10, lineHeight: 1.5, marginBottom: 2 },
      });

      const candidateName = rawText
        ? extractCandidateName(rawText, fileName ?? "")
        : fileName?.split(" - ")[0] ?? "Resume";

      const sections: React.ReactNode[] = [];

      if (summaryDisplay) {
        sections.push(
          React.createElement(Text, { key: "summary-h", style: styles.sectionHeader }, "SUMMARY"),
          React.createElement(Text, { key: "summary-b", style: styles.body }, summaryDisplay),
        );
      }

      if (experienceDisplay) {
        sections.push(
          React.createElement(Text, { key: "exp-h", style: styles.sectionHeader }, "EXPERIENCE"),
        );
        experienceDisplay.split("\n").filter(Boolean).forEach((line, i) => {
          sections.push(
            React.createElement(Text, { key: `exp-${i}`, style: styles.bullet }, `• ${line}`),
          );
        });
      }

      if (skillsDisplay) {
        sections.push(
          React.createElement(Text, { key: "skills-h", style: styles.sectionHeader }, "SKILLS"),
          React.createElement(Text, { key: "skills-b", style: styles.body }, skillsDisplay),
        );
      }

      if (educationDisplay) {
        sections.push(
          React.createElement(Text, { key: "edu-h", style: styles.sectionHeader }, "EDUCATION"),
          React.createElement(Text, { key: "edu-b", style: styles.body }, educationDisplay),
        );
      }

      const doc = React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: "A4", style: styles.page },
          React.createElement(Text, { style: styles.name }, candidateName),
          React.createElement(
            Text,
            { style: styles.contact },
            [profile?.headline, "Singapore"].filter(Boolean).join(" • "),
          ),
          React.createElement(View, { style: styles.divider }),
          ...sections,
        ),
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = candidateName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      a.href = url;
      a.download = `${slug}_vericlause_resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setDownloadingPdf(false);
    }
  }

  const baseScore = deriveIndicatorScore(suggestions);
  const score = rescoreScore ?? baseScore;
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

  const summaryDisplay = summaryOverride !== null ? summaryOverride : summaryValue;
  const experienceDisplay = experienceOverride !== null ? experienceOverride : experienceValue;
  const skillsDisplay = skillsOverride !== null ? skillsOverride : skillsValue;
  const educationDisplay = educationOverride !== null ? educationOverride : educationValue;

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

              {rescoreError && (
                <p className="mt-2 text-xs text-red-600">{rescoreError}</p>
              )}

              <button
                type="button"
                onClick={handleRescore}
                disabled={rescoring}
                className="mt-4 w-full rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-navy-200 hover:text-navy-950 disabled:opacity-50"
              >
                {rescoring ? "Rescoring…" : "Rescore Resume"}
              </button>
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

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateImproved}
                    disabled={improving}
                    className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
                  >
                    {improving ? "Generating improved version…" : "Generate Improved Version"}
                  </button>
                  {improveError && (
                    <p className="self-center text-xs text-red-600">{improveError}</p>
                  )}
                </div>
              </div>
            ) : null}

            {improvedText ? (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                  Improved Resume Preview
                </p>
                <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {improvedText}
                </pre>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleApplyImproved}
                    className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  >
                    Update Resume with Improved Version
                  </button>
                  <button
                    type="button"
                    onClick={() => setImprovedText(null)}
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_summary")}
                </label>
                <textarea
                  rows={5}
                  value={summaryDisplay}
                  onChange={(e) => setSummaryOverride(e.target.value)}
                  placeholder="No summary extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-navy-950 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_experience")}
                </label>
                <textarea
                  rows={8}
                  value={experienceDisplay}
                  onChange={(e) => setExperienceOverride(e.target.value)}
                  placeholder="No experience extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-navy-950 focus:bg-white whitespace-pre-wrap"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_skills")}
                </label>
                <textarea
                  rows={4}
                  value={skillsDisplay}
                  onChange={(e) => setSkillsOverride(e.target.value)}
                  placeholder="No skills extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-navy-950 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_education")}
                </label>
                <textarea
                  rows={3}
                  value={educationDisplay}
                  onChange={(e) => setEducationOverride(e.target.value)}
                  placeholder="No education extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-navy-950 focus:bg-white whitespace-pre-wrap"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-navy-200 hover:text-navy-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloadingPdf ? "Generating PDF…" : t("resume_review_download_pdf")}
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
