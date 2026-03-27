"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
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

function parseImprovedResume(text: string): {
  summary: string;
  experience: string;
  skills: string;
  education: string;
} {
  const lines = text.split("\n");
  const sections: Record<string, string[]> = { summary: [], experience: [], skills: [], education: [] };
  let current = "summary";

  for (const line of lines) {
    // Strip markdown bold markers for header detection: **Work Experience** → work experience
    const stripped = line.replace(/\*\*/g, "").trim();

    if (/^(summary|professional summary|profile|about me|objective)\s*:?\s*$/i.test(stripped)) {
      current = "summary"; continue;
    }
    if (/^(experience|work experience|employment|career|professional experience)\s*:?\s*$/i.test(stripped)) {
      current = "experience"; continue;
    }
    if (/^(skills|technical skills|core competencies|key competencies|competencies|areas of expertise)\s*:?\s*$/i.test(stripped)) {
      current = "skills"; continue;
    }
    if (/^(education|academic|qualifications|certifications?)\s*:?\s*$/i.test(stripped)) {
      current = "education"; continue;
    }

    // Also skip lines that are only decorators like "---" or "==="
    if (/^[-=]{3,}$/.test(stripped)) continue;

    sections[current].push(line);
  }

  return {
    summary: sections.summary.join("\n").trim(),
    experience: sections.experience.join("\n").trim(),
    skills: sections.skills.join("\n").trim(),
    education: sections.education.join("\n").trim(),
  };
}

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
  const [improving, setImproving] = useState(false);
  const [improvedResume, setImprovedResume] = useState<string | null>(null);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreScore, setRescoreScore] = useState<number | null>(null);
  const [overrideSummary, setOverrideSummary] = useState<string | null>(null);
  const [overrideExperience, setOverrideExperience] = useState<string | null>(null);
  const [overrideSkills, setOverrideSkills] = useState<string | null>(null);
  const [overrideEducation, setOverrideEducation] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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

      // Check for a voice-generated resume first
      try {
        const voiceRaw = sessionStorage.getItem("vericlause.voiceBuilderResult");
        if (voiceRaw) {
          sessionStorage.removeItem("vericlause.voiceBuilderResult");
          const v = JSON.parse(voiceRaw);
          const syntheticProfile = {
            headline: v.targetRole ?? null,
            summary: v.summary ?? null,
            skills: v.skills
              ? v.skills.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean)
              : [],
            years_experience: null,
            experiences: v.experience
              ? [{ title: null, company: null, start_date: null, end_date: null, description: v.experience }]
              : [],
            education: v.education
              ? [{ institution: null, qualification: v.education, field_of_study: null, graduation_year: null }]
              : [],
            target_roles: v.targetRole ? [v.targetRole] : [],
            target_industries: [],
            location_preference: null,
            seniority_level: null,
          };
          if (!cancelled) {
            setFileName("Voice Resume");
            setProfile(syntheticProfile as any);
            setOverrideSummary(v.summary ?? null);
            setOverrideExperience(
              [v.experience, v.achievement ? `Achievement: ${v.achievement}` : ""].filter(Boolean).join("\n\n") || null,
            );
            setOverrideSkills(v.skills ?? null);
            setOverrideEducation(
              [v.education, v.certifications].filter(Boolean).join("\n") || null,
            );
            setLoading(false);
          }
          return;
        }
      } catch {
        // sessionStorage unavailable or parse error — fall through to normal load
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
    if (!profile) return;
    setImproving(true);
    setImproveError(null);
    setImprovedResume(null);

    const resumeText = [
      profile.summary,
      formatExperiencesText(profile),
      profile.skills?.length ? `Skills: ${profile.skills.join(", ")}` : "",
      formatEducationText(profile),
    ]
      .filter(Boolean)
      .join("\n\n");

    const feedback = suggestions?.map((s) =>
      s.suggested_rewrite ? `${s.suggestion} → ${s.suggested_rewrite}` : s.suggestion,
    ) ?? [];

    try {
      const res = await fetch("/api/resume/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, feedback }),
      });
      const json = await res.json();
      if (!res.ok) {
        setImproveError(json.detail ?? "Something went wrong. Please try again.");
        return;
      }
      setImprovedResume(json.improvedResume);
    } catch {
      setImproveError("Network error. Please check your connection and try again.");
    } finally {
      setImproving(false);
    }
  }

  function getDownloadContent() {
    if (improvedResume) return improvedResume;
    return [
      profile?.summary ?? "",
      profile ? formatExperiencesText(profile) : "",
      profile?.skills?.length ? `Skills: ${profile.skills.join(", ")}` : "",
      profile ? formatEducationText(profile) : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  async function handleDownloadPdf() {
    const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

    // 2 cm margins (1 pt ≈ 0.0353 cm → 2 cm ≈ 56.7 pt)
    const MARGIN = 56.7;

    const styles = StyleSheet.create({
      page: {
        paddingHorizontal: MARGIN,
        paddingVertical: MARGIN,
        fontFamily: "Helvetica",
        backgroundColor: "#ffffff",
      },
      name: {
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        marginBottom: 4,
      },
      contact: {
        fontSize: 9,
        color: "#6b7280",
        marginBottom: 10,
      },
      divider: {
        borderBottomWidth: 1,
        borderBottomColor: "#d1d5db",
        marginBottom: 14,
      },
      sectionHeader: {
        fontSize: 11,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        textTransform: "uppercase" as const,
        marginTop: 16,
        marginBottom: 6,
        paddingBottom: 2,
        borderBottomWidth: 0.5,
        borderBottomColor: "#e5e7eb",
      },
      bodyText: {
        fontSize: 10,
        color: "#374151",
        lineHeight: 1.55,
        marginBottom: 3,
      },
      expBlock: { marginBottom: 8 },
      expTitle: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        marginBottom: 1,
      },
      expDates: {
        fontSize: 9,
        color: "#6b7280",
        marginBottom: 3,
      },
      bulletRow: {
        flexDirection: "row" as const,
        marginBottom: 2,
        paddingLeft: 8,
      },
      bulletDot: { width: 10, fontSize: 10, color: "#374151" },
      bulletText: { flex: 1, fontSize: 10, color: "#374151", lineHeight: 1.55 },
    });

    const candidateName = (profile as any)?.full_name || profile?.headline || "Resume";
    const safeFileName =
      candidateName.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") ||
      "resume";
    const fileName = `${safeFileName}_vericlause_resume.pdf`;

    const contactParts = [
      (profile as any)?.email,
      (profile as any)?.phone,
      (profile as any)?.location,
    ].filter(Boolean);
    const contactLine = contactParts.join("  |  ");

    // Parse experience text into structured blocks separated by blank lines.
    // Within each block: first line = role/company header, second line = dates if it
    // contains a year or "present", remaining lines = bullet points.
    function buildExperienceNodes() {
      if (!experienceValue) return [];
      const datePattern = /\d{4}|present|current/i;
      return experienceValue
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, bi) => {
          const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
          const [headerLine, ...rest] = lines;
          let datesLine = "";
          let bulletLines = rest;
          if (rest.length > 0 && datePattern.test(rest[0])) {
            datesLine = rest[0];
            bulletLines = rest.slice(1);
          }
          const cleanText = (s: string) => s.replace(/\*\*/g, "").replace(/^[-•*]\s*/, "");
          return React.createElement(
            View,
            { key: bi, style: styles.expBlock },
            React.createElement(Text, { style: styles.expTitle }, cleanText(headerLine)),
            datesLine
              ? React.createElement(Text, { style: styles.expDates }, cleanText(datesLine))
              : null,
            ...bulletLines.map((line, li) =>
              React.createElement(
                View,
                { key: li, style: styles.bulletRow },
                React.createElement(Text, { style: styles.bulletDot }, "•"),
                React.createElement(Text, { style: styles.bulletText }, cleanText(line)),
              ),
            ),
          );
        });
    }

    const strip = (s: string) => s.replace(/\*\*/g, "");

    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        React.createElement(
          View,
          null,
          // ── Header ──────────────────────────────────────────
          React.createElement(Text, { style: styles.name }, candidateName),
          contactLine
            ? React.createElement(Text, { style: styles.contact }, contactLine)
            : null,
          React.createElement(View, { style: styles.divider }),

          // ── Summary ─────────────────────────────────────────
          summaryValue
            ? React.createElement(
                View,
                null,
                React.createElement(Text, { style: styles.sectionHeader }, "Summary"),
                React.createElement(Text, { style: styles.bodyText }, strip(summaryValue)),
              )
            : null,

          // ── Experience ──────────────────────────────────────
          experienceValue
            ? React.createElement(
                View,
                null,
                React.createElement(Text, { style: styles.sectionHeader }, "Experience"),
                ...buildExperienceNodes(),
              )
            : null,

          // ── Skills ──────────────────────────────────────────
          skillsValue
            ? React.createElement(
                View,
                null,
                React.createElement(Text, { style: styles.sectionHeader }, "Skills"),
                React.createElement(Text, { style: styles.bodyText }, strip(skillsValue)),
              )
            : null,

          // ── Education ───────────────────────────────────────
          educationValue
            ? React.createElement(
                View,
                null,
                React.createElement(Text, { style: styles.sectionHeader }, "Education"),
                React.createElement(Text, { style: styles.bodyText }, strip(educationValue)),
              )
            : null,
        ),
      ),
    );

    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadDocx() {
    const content = getDownloadContent();
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const children = content.split("\n").map(
      (line) => new Paragraph({ children: [new TextRun(line)] }),
    );
    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume_improved.docx";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleApplyImproved() {
    if (!improvedResume) return;
    const parsed = parseImprovedResume(improvedResume);

    // If section parsing found nothing useful, fall back to putting
    // the entire improved text into the experience field as a single block.
    const hasAnySections = parsed.summary || parsed.experience || parsed.skills || parsed.education;

    if (hasAnySections) {
      if (parsed.summary) setOverrideSummary(parsed.summary);
      if (parsed.experience) setOverrideExperience(parsed.experience);
      if (parsed.skills) setOverrideSkills(parsed.skills);
      if (parsed.education) setOverrideEducation(parsed.education);
    } else {
      setOverrideExperience(improvedResume);
    }

    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 3000);
    sectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleRescore() {
    const text = getDownloadContent();
    if (!text.trim()) return;
    setRescoring(true);
    try {
      const res = await fetch("/api/resume/rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (res.ok && typeof json.score === "number") {
        setRescoreScore(json.score * 10);
      }
    } catch {
      // silently keep current score
    } finally {
      setRescoring(false);
    }
  }

  const score = rescoreScore ?? deriveIndicatorScore(suggestions);
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

  const summaryValue = overrideSummary ?? profile?.summary ?? "";
  const experienceValue = overrideExperience ?? (profile ? formatExperiencesText(profile) : "");
  const skillsValue = overrideSkills ?? (profile?.skills?.length ? profile.skills.join(", ") : "");
  const educationValue = overrideEducation ?? (profile ? formatEducationText(profile) : "");

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
                <div className="flex flex-col items-end gap-2">
                  <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {t("resume_review_score_status")}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRescore()}
                    disabled={rescoring || !profile}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {rescoring ? (
                      <>
                        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Rescoring…
                      </>
                    ) : "Rescore Resume"}
                  </button>
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
                <button
                  type="button"
                  onClick={() => void handleGenerateImproved()}
                  disabled={improving || !profile}
                  className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {improving ? "Generating…" : t("resume_review_generate_new")}
                </button>
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

            <div ref={sectionRef} className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_summary")}
                </label>
                <textarea
                  rows={5}
                  value={summaryValue}
                  onChange={(e) => setOverrideSummary(e.target.value)}
                  placeholder="No summary extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-navy-300 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_experience")}
                </label>
                <textarea
                  rows={8}
                  value={experienceValue}
                  onChange={(e) => setOverrideExperience(e.target.value)}
                  placeholder="No experience extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none whitespace-pre-wrap focus:border-navy-300 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_skills")}
                </label>
                <textarea
                  rows={4}
                  value={skillsValue}
                  onChange={(e) => setOverrideSkills(e.target.value)}
                  placeholder="No skills extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-navy-300 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  {t("resume_review_education")}
                </label>
                <textarea
                  rows={3}
                  value={educationValue}
                  onChange={(e) => setOverrideEducation(e.target.value)}
                  placeholder="No education extracted yet."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none whitespace-pre-wrap focus:border-navy-300 focus:bg-white"
                />
              </div>
            </div>

            {improveError ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {improveError}
              </div>
            ) : null}

            {improvedResume ? (
              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold text-navy-950">
                  Improved Resume
                </label>
                <textarea
                  rows={20}
                  readOnly
                  value={improvedResume}
                  className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-slate-700 outline-none whitespace-pre-wrap"
                />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleApplyImproved}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Update Resume with Improved Version
                  </button>
                  {updateSuccess ? (
                    <span className="text-sm font-medium text-emerald-600">
                      Resume updated — review and adjust the fields as needed
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!profile}
                  onClick={handleDownloadPdf}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("resume_review_download_pdf")}
                </button>
                <button
                  type="button"
                  disabled={!profile}
                  onClick={() => void handleDownloadDocx()}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
