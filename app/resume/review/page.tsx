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
import type { ResumeFeedback } from "@/app/api/resume/route";
import type { ResumeTemplateData } from "@/lib/resume-templates/types";
import { TemplatePickerModal } from "@/components/resume/TemplatePickerModal";

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

function parseImprovedResume(text: string): {
  summary: string | null;
  experience: string | null;
  skills: string | null;
  education: string | null;
} {
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

  if (!summary && !experience && !skills && !education) {
    return { summary: null, experience: text.trim(), skills: null, education: null };
  }

  return { summary, experience, skills, education };
}

function sanitiseName(raw: string): string {
  return raw.replace(/^[#\s]+|[#\s]+$/g, "").trim();
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
  if (firstMeaningfulLine) return sanitiseName(firstMeaningfulLine);
  const fromFileName = fileName.split(" - ")[0].trim();
  return sanitiseName(fromFileName) || "";
}

function extractEmail(text: string): string | null {
  return text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
}

function extractPhone(text: string): string | null {
  return text.match(/(?:\+65[\s-]?)?[689]\d{3}[\s-]?\d{4}/)?.[0] ?? null;
}

/** Assign each ResumeSuggestion to its most relevant section by keyword matching. */
function assignSuggestionSection(s: ResumeSuggestion): "summary" | "experience" | "skills" | "education" {
  const lower = (s.suggestion + " " + (s.suggested_rewrite ?? "")).toLowerCase();
  if (/\bsummary\b|professional profile|opening statement|career objective|introduction/.test(lower))
    return "summary";
  if (/\bexperience\b|work history|work experience|\brole\b|\bjob\b|position|company|achievement|bullet|quantif|action verb|responsibilit|managed|coordinated|implemented/.test(lower))
    return "experience";
  if (/\beducation\b|degree|qualification|school|university|institution|academic|gpa/.test(lower))
    return "education";
  return "skills";
}

/** C1: count lines in experience text that contain a number + metric indicator */
function countQuantifiedAchievements(text: string): number {
  if (!text.trim()) return 0;
  const lines = text.split(/[\n.•]+/).map((l) => l.trim()).filter(Boolean);
  return lines.filter(
    (line) =>
      /\d/.test(line) &&
      /[%$]|\bSGD\b|\d+[kKmMbB]\b|\bmillion\b|\bbillion\b|\bthousand\b|\bfold\b|\bx\b/i.test(line),
  ).length;
}

/** C2: count how many keywords from the list appear in the resume text */
function countKeywordsFound(resumeText: string, keywords: string[]): number {
  if (!keywords.length) return 0;
  const lower = resumeText.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

function SuggestionBox({ items, hidden, t }: { items: ResumeSuggestion[]; hidden?: boolean; t: (key: string) => string }) {
  if (!items.length || hidden) return null;
  return (
    <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-xs font-medium text-green-700">{t("ai_suggestion_badge")}</span>
      </div>
      <div className="space-y-0">
        {items.map((s, i) => (
          <div key={i} className={i > 0 ? "mt-3 border-t border-green-200 pt-3" : ""}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700">
              {t("what_to_improve")}
            </p>
            <p className="text-sm leading-relaxed text-gray-800">{s.suggestion}</p>
            {s.suggested_rewrite ? (
              <>
                <p className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-green-700">
                  {t("suggested_replacement")}
                </p>
                <p className="text-sm leading-relaxed text-gray-700 italic">{s.suggested_rewrite}</p>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumeReviewContent() {
  const { t, locale } = useLanguage();
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
  const [feedback, setFeedback] = useState<ResumeFeedback | null>(null);

  // Editable override states
  const [summaryOverride, setSummaryOverride] = useState<string | null>(null);
  const [experienceOverride, setExperienceOverride] = useState<string | null>(null);
  const [skillsOverride, setSkillsOverride] = useState<string | null>(null);
  const [educationOverride, setEducationOverride] = useState<string | null>(null);

  // Improve / download states
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [suggestionsApplied, setSuggestionsApplied] = useState(false);

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
      setSummaryOverride(null);
      setExperienceOverride(null);
      setSkillsOverride(null);
      setEducationOverride(null);
      setSuggestionsApplied(false);
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

      try {
        const raw = sessionStorage.getItem("vericlause.resumeFeedback");
        if (raw) {
          const parsed = JSON.parse(raw) as ResumeFeedback;
          if (!cancelled) setFeedback(parsed);
        }
      } catch (e) {
        console.warn("Could not restore resume feedback from sessionStorage:", e);
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

  /** One-shot: generate improved version and immediately apply it to the editable fields. */
  async function handleApplyAiSuggestions() {
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

      const parsed = parseImprovedResume(data.improvedResume);
      if (parsed.summary) setSummaryOverride(parsed.summary);
      if (parsed.experience) setExperienceOverride(parsed.experience);
      if (parsed.skills) setSkillsOverride(parsed.skills);
      if (parsed.education) setEducationOverride(parsed.education);
      setSuggestionsApplied(true);
    } catch (e) {
      setImproveError(e instanceof Error ? e.message : "Improvement failed");
    } finally {
      setImproving(false);
    }
  }

  function buildTemplateData(): ResumeTemplateData {
    const name = rawText
      ? extractCandidateName(rawText, fileName ?? "")
      : fileName?.split(" - ")[0] ?? "Resume";

    const experiences = (profile?.experiences ?? []).map((e) => ({
      title: e.title ?? "",
      company: e.company ?? "",
      location: undefined,
      startDate: e.start_date ?? "",
      endDate: e.end_date ?? "",
      description: experienceOverride !== null ? "" : (e.description ?? ""),
    }));

    // If the user edited experience text, put it as a single entry
    const finalExperiences =
      experienceOverride !== null
        ? [{ title: "", company: "", startDate: "", endDate: "", description: experienceDisplay }]
        : experiences;

    const educations = (profile?.education ?? []).map((ed) => ({
      institution: ed.institution ?? "",
      qualification: ed.qualification ?? "",
      fieldOfStudy: ed.field_of_study ?? undefined,
      graduationYear: ed.graduation_year != null ? String(ed.graduation_year) : undefined,
    }));

    const skills = (profile?.skills ?? []).map((s) => ({ name: s, level: 50 }));

    return {
      name,
      jobTitle: profile?.headline ?? undefined,
      email: extractedEmail ?? undefined,
      phone: extractedPhone ?? undefined,
      location: extractedAddress ?? undefined,
      summary: summaryDisplay || undefined,
      experiences: finalExperiences,
      educations,
      skills,
    };
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const summaryValue = profile?.summary ?? "";
  const experienceValue = profile ? formatExperiencesText(profile) : "";
  const skillsValue = profile?.skills?.length ? profile.skills.join(", ") : "";
  const educationValue = profile ? formatEducationText(profile) : "";

  const summaryDisplay = summaryOverride !== null ? summaryOverride : summaryValue;
  const experienceDisplay = experienceOverride !== null ? experienceOverride : experienceValue;
  const skillsDisplay = skillsOverride !== null ? skillsOverride : skillsValue;
  const educationDisplay = educationOverride !== null ? educationOverride : educationValue;

  // Profile block contact fields extracted from raw text
  const candidateName = rawText
    ? extractCandidateName(rawText, fileName ?? "")
    : fileName?.split(" - ")[0] ?? "";
  const extractedEmail = rawText ? extractEmail(rawText) : null;
  const extractedPhone = rawText ? extractPhone(rawText) : null;
  const extractedAddress = profile?.location_preference ?? null;

  // ── Left panel score (5-criterion rubric, /100, live) ───────────────────────

  // C1: Impact & metrics — 4 pts per quantified achievement in experience, cap 20
  const c1Impact = Math.min(20, countQuantifiedAchievements(experienceDisplay) * 4);

  // C2: ATS keyword coverage — 2 pts per keyword from feedback found in resume, cap 20
  const atsKwFound: string[] = Array.isArray(feedback?.atsAnalysis?.keywordsFound)
    ? feedback!.atsAnalysis.keywordsFound
    : [];
  if (feedback && !Array.isArray(feedback?.atsAnalysis?.keywordsFound)) {
    console.warn("[ResumeReview] feedback.atsAnalysis.keywordsFound missing/unexpected", feedback?.atsAnalysis);
  }
  const allResumeText = [summaryDisplay, experienceDisplay, skillsDisplay, educationDisplay].join(" ");
  const c2Ats = Math.min(20, countKeywordsFound(allResumeText, atsKwFound) * 2);

  // C3: Completeness — 5 pts per non-empty section, cap 20
  const c3Complete =
    [summaryDisplay, experienceDisplay, skillsDisplay, educationDisplay]
      .filter((t) => t.trim().length > 0).length * 5;

  // C4: Improvements resolved — 0 before Apply, 20 after
  const c4Resolved = suggestionsApplied ? 20 : 0;

  // C5: Language & structure — AI score /10 → /20
  const aiRawScore = typeof feedback?.score === "number" ? feedback.score : null;
  if (feedback && typeof feedback?.score !== "number") {
    console.warn("[ResumeReview] feedback.score missing or not a number", feedback?.score);
  }
  const c5Language = aiRawScore !== null ? Math.min(20, Math.round(aiRawScore * 2)) : 0;

  const score = Math.round(c1Impact + c2Ats + c3Complete + c4Resolved + c5Language);

  const scoreLabel =
    score >= 80 ? "Strong"
    : score >= 60 ? "Needs improvement"
    : "Weak";
  const scoreLabelClass =
    score >= 80 ? "bg-emerald-100 text-emerald-700"
    : score >= 60 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  const scoreBarClass =
    score >= 80 ? "bg-emerald-500"
    : score >= 60 ? "bg-amber-500"
    : "bg-red-500";
  const scoreCommentary =
    score >= 80
      ? "Your resume is well-structured and competitive for the Singapore market. Minor refinements can push it further."
      : score >= 60
      ? "There are actionable improvements that could meaningfully boost your chances. Review the suggestions below."
      : "Several high-priority gaps were identified. Addressing them will significantly strengthen your application.";

  // Left panel lists — wired directly to AI feedback fields
  const strengthsList: string[] = Array.isArray(feedback?.keyStrengths) ? feedback!.keyStrengths : [];
  if (feedback && !Array.isArray(feedback?.keyStrengths)) {
    console.warn("[ResumeReview] feedback.keyStrengths missing/unexpected", feedback?.keyStrengths);
  }
  const improvementsList: string[] = Array.isArray(feedback?.areasToImprove) ? feedback!.areasToImprove : [];
  if (feedback && !Array.isArray(feedback?.areasToImprove)) {
    console.warn("[ResumeReview] feedback.areasToImprove missing/unexpected", feedback?.areasToImprove);
  }
  const keywordsMissing: string[] = Array.isArray(feedback?.atsAnalysis?.keywordsMissing)
    ? feedback!.atsAnalysis.keywordsMissing
    : [];
  if (feedback && !Array.isArray(feedback?.atsAnalysis?.keywordsMissing)) {
    console.warn("[ResumeReview] feedback.atsAnalysis.keywordsMissing missing/unexpected", feedback?.atsAnalysis);
  }

  // Per-section inline suggestions (keyword-matched from Supabase ai_suggestions)
  const summarySuggestions = (suggestions ?? []).filter((s) => assignSuggestionSection(s) === "summary");
  const experienceSuggestions = (suggestions ?? []).filter((s) => assignSuggestionSection(s) === "experience");
  const skillsSuggestions = (suggestions ?? []).filter((s) => assignSuggestionSection(s) === "skills");
  const educationSuggestions = (suggestions ?? []).filter((s) => assignSuggestionSection(s) === "education");

  // ── Render ──────────────────────────────────────────────────────────────────

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

      <main className="mx-auto max-w-7xl px-6 py-14">
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
          <div className="flex items-start gap-6">

            {/* LEFT PANEL */}
            <aside className="w-1/3 shrink-0 space-y-4">

              {/* Block 1 — Resume Score */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("resume_review_score_label")}
                  </p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreLabelClass}`}>
                    {scoreLabel}
                  </span>
                </div>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-5xl font-bold text-navy-950">{score}</span>
                  <span className="mb-1 text-xl font-medium text-slate-400">/100</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full transition-all ${scoreBarClass}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                  {t("score_disclaimer")}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{scoreCommentary}</p>
              </div>

              {/* Block 2 — Strengths */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-navy-950">{t("resume_review_strengths_title")}</p>
                {strengthsList.length ? (
                  <ul className="space-y-2">
                    {strengthsList.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                          <svg className="h-3 w-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No strengths identified yet.</p>
                )}
              </div>

              {/* Block 3 — Suggested Improvements */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-navy-950">{t("resume_review_improvements_title")}</p>
                {improvementsList.length ? (
                  <ul className="space-y-2">
                    {improvementsList.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No improvements flagged.</p>
                )}
              </div>

              {/* Block 4 — Missing or Weak Keywords */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-1 text-sm font-semibold text-navy-950">{t("resume_review_keywords_title")}</p>
                <p className="mb-3 text-xs leading-relaxed text-slate-500">
                  {t("resume_review_keywords_description")}
                </p>
                {keywordsMissing.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {keywordsMissing.map((kw, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No keyword gaps identified yet.</p>
                )}
              </div>

            </aside>

            {/* RIGHT PANEL */}
            <div className="w-2/3 space-y-8">

            {/* SECTION 1 — PAGE HEADER */}
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-600">
                {t("resume_review_badge")}
              </p>
              <h1 className="font-serif text-4xl font-bold text-navy-950 md:text-5xl">
                {profile.headline ?? t("resume_review_title")}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                {t("resume_review_subtitle")}
              </p>
            </section>

            {/* SECTION 2 — PROFILE BLOCK */}
            {(candidateName || extractedEmail || extractedPhone || extractedAddress) ? (
              <section>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {candidateName ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t("field_full_name")}</p>
                      <p className="mt-1 text-sm font-medium text-navy-950">{candidateName}</p>
                    </div>
                  ) : null}
                  {extractedEmail ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t("field_email")}</p>
                      <p className="mt-1 text-sm font-medium text-navy-950">{extractedEmail}</p>
                    </div>
                  ) : null}
                  {extractedPhone ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t("field_phone")}</p>
                      <p className="mt-1 text-sm font-medium text-navy-950">{extractedPhone}</p>
                    </div>
                  ) : null}
                  {extractedAddress ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t("field_address")}</p>
                      <p className="mt-1 text-sm font-medium text-navy-950">{extractedAddress}</p>
                    </div>
                  ) : null}
                </div>
                <hr className="mt-6 border-slate-200" />
              </section>
            ) : null}

            {/* SECTION 3 — RESUME SECTIONS WITH INLINE AI SUGGESTIONS */}
            <section className="space-y-8">

              {/* Professional Summary */}
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
                <SuggestionBox items={summarySuggestions} hidden={suggestionsApplied} t={t} />
              </div>

              {/* Work Experience */}
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
                <SuggestionBox items={experienceSuggestions} hidden={suggestionsApplied} t={t} />
              </div>

              {/* Skills */}
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
                <SuggestionBox items={skillsSuggestions} hidden={suggestionsApplied} t={t} />
              </div>

              {/* Education */}
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
                <SuggestionBox items={educationSuggestions} hidden={suggestionsApplied} t={t} />
              </div>

            </section>

            {/* Improve error */}
            {improveError ? (
              <p className="text-xs text-red-600">{improveError}</p>
            ) : null}

            {/* SECTION 4 — BOTTOM ACTION BAR */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => void handleApplyAiSuggestions()}
                disabled={improving}
                className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {improving ? "Applying…" : t("resume_review_apply_ai")}
              </button>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowTemplatePicker(true)}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_review_download")}
                </button>
                <Link
                  href={`/resume${resumeId ? `?resume_id=${encodeURIComponent(resumeId)}` : ""}`}
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

            </div>
          </div>
        ) : null}

        {showTemplatePicker ? (
          <TemplatePickerModal
            data={buildTemplateData()}
            onClose={() => setShowTemplatePicker(false)}
            language={locale}
          />
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
