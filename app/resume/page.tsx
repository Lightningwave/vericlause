"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { ResumeList } from "@/components/resume/ResumeList";
import { useLanguage } from "@/components/providers/language-provider";
import { useResumeStatus } from "@/components/providers/resume-status-provider";
import { createClient } from "@/lib/supabase/client";
import {
  getProfileJob,
  getResumeById,
  listResumes,
  profileResume,
  uploadResume,
  type ResumeSummary,
} from "@/lib/api";
import type { ResumeProfile } from "@/lib/types";
import type { ResumeFeedback } from "@/app/api/resume/route";

function StepPill({
  number,
  label,
  active,
  complete,
}: {
  number: number;
  label: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
        complete
          ? "border-emerald-200 bg-emerald-50"
          : active
            ? "border-navy-950 bg-white shadow-sm"
            : "border-slate-200 bg-slate-50"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
          complete
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-navy-950 text-white"
              : "bg-white text-slate-500 border border-slate-200"
        }`}
      >
        {complete ? "✓" : number}
      </span>
      <span
        className={`text-sm font-medium ${
          complete ? "text-emerald-800" : active ? "text-navy-950" : "text-slate-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StatusBanner({
  tone,
  children,
}: {
  tone: "success" | "warning" | "error" | "info";
  children: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

function ResumeOnboardingContent() {
  const { t, locale } = useLanguage();
  const { status: resumeStatus, refetch: refetchResumeStatus } = useResumeStatus();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [profiling, setProfiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResumeId, setLastResumeId] = useState<string | null>(null);
  const [userResumes, setUserResumes] = useState<ResumeSummary[]>([]);

  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const [voiceText, setVoiceText] = useState("");
  const recognizerRef = useRef<{ stop: () => void } | null>(null);

  const [uploadComplete, setUploadComplete] = useState(false);
  const [feedback, setFeedback] = useState<ResumeFeedback | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const analysisSteps = [
    t("upload_step_reading"),
    t("upload_step_ats"),
    t("upload_step_career"),
    t("upload_step_salary"),
    t("upload_step_finalising"),
  ];

  const stage = !selectedFile ? 0 : !uploadComplete ? 1 : !analysisComplete ? 2 : 3;

  useEffect(() => {
    if (!analysing) {
      setAnalysisStep(0);
      return;
    }
    const timers = [
      setTimeout(() => setAnalysisStep(1), 2000),
      setTimeout(() => setAnalysisStep(2), 5000),
      setTimeout(() => setAnalysisStep(3), 8000),
      setTimeout(() => setAnalysisStep(4), 11000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [analysing]);

  useEffect(() => {
    const supabase = createClient();
    const paramResumeId = searchParams.get("resume_id");
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      void listResumes()
        .then((r) => {
          setUserResumes(r.resumes);
          if (paramResumeId) {
            setLastResumeId(paramResumeId);
          }
        })
        .catch(() => setUserResumes([]));
    });
  }, [searchParams]);

  const handleResumeDeleted = useCallback(
    (resumeId: string) => {
      setUserResumes((prev) => prev.filter((r) => r.id !== resumeId));
      void refetchResumeStatus();
    },
    [refetchResumeStatus],
  );

  const setFile = useCallback((file: File | null) => {
    setSelectedFile(file);
    setSelectedFileName(file?.name ?? "");
    setError(null);
    setFeedback(null);
    setAnalysisError(null);
    setUploadComplete(false);
    setAnalysisComplete(false);
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) setFile(file);
  }

  function handleClear() {
    setFile(null);
    setVoiceText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleUpload = useCallback(async () => {
    setError(null);

    if (!selectedFile) {
      setError(t("resume_error_no_file"));
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/sign-in?next=/resume");
      return;
    }

    const lower = selectedFile.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      setError(t("resume_error_file_type"));
      return;
    }

    setUploading(true);

    try {
      const uploadResult = await uploadResume(selectedFile);
      const { resume_id } = uploadResult;
      setLastResumeId(null);
      setProfiling(true);

      let started: {
        job_id: string;
        status: string;
        profile?: ResumeProfile;
      };

      if ("profiling_error" in uploadResult) {
        started = await profileResume(resume_id);
      } else if (uploadResult.status === "succeeded") {
        started = {
          job_id: uploadResult.job_id,
          status: "succeeded",
          profile: uploadResult.profile,
        };
      } else {
        started = {
          job_id: uploadResult.job_id,
          status: uploadResult.status,
        };
      }

      if (started.status === "succeeded" && started.profile) {
        setLastResumeId(resume_id);
        try {
          sessionStorage.setItem("vericlause.lastResumeId", resume_id);
        } catch {}
        setUploadComplete(true);
        setProfiling(false);
        return;
      }

      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        const { job, resume } = await getProfileJob(started.job_id);

        if (job.status === "succeeded" && resume?.parsed_profile) {
          setLastResumeId(resume_id);
          try {
            sessionStorage.setItem("vericlause.lastResumeId", resume_id);
          } catch {}
          setUploadComplete(true);
          setProfiling(false);
          return;
        }

        if (job.status === "failed") {
          throw new Error(job.error ?? t("resume_error_profiling_failed"));
        }

        await new Promise((r) => setTimeout(r, 1500));
      }

      try {
        sessionStorage.setItem("vericlause.lastResumeId", resume_id);
      } catch {}

      setLastResumeId(resume_id);
      setUploadComplete(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("resume_error_upload_failed"));
    } finally {
      setUploading(false);
      setProfiling(false);
      void refetchResumeStatus();
      void listResumes()
        .then((r) => setUserResumes(r.resumes))
        .catch(() => {});
    }
  }, [router, selectedFile, refetchResumeStatus, t]);

  async function handleAnalyse() {
    if (!selectedFile) return;

    setAnalysing(true);
    setAnalysisError(null);
    setFeedback(null);

    let translatedText: string | null = null;

    if (locale !== "en" && lastResumeId) {
      setTranslating(true);
      try {
        const resumeData = await getResumeById(lastResumeId);
        const rawText = resumeData?.resume?.raw_text;
        if (rawText) {
          const res = await fetch("/api/resume/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawText, targetLanguage: locale }),
          });
          const data = await res.json();
          translatedText = (data.translatedText as string) || null;
        }
      } catch {
      } finally {
        setTranslating(false);
      }
    }

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("voiceText", voiceText);
      formData.append("language", locale);
      if (translatedText) formData.append("translatedText", translatedText);

      const res = await fetch("/api/resume", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setAnalysisError(json.detail ?? "Something went wrong. Please try again.");
        return;
      }

      setFeedback(json.feedback as ResumeFeedback);
      try {
        sessionStorage.setItem("vericlause.resumeFeedback", JSON.stringify(json.feedback));
      } catch {}
      setAnalysisComplete(true);
    } catch {
      setAnalysisError("Network error. Please check your connection and try again.");
    } finally {
      setAnalysing(false);
    }
  }

  function handleMicClick() {
    if (micState === "listening") {
      recognizerRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;

    const micLangMap: Record<string, string> = {
      en: "en-SG",
      zh: "zh-CN",
      ms: "ms-MY",
      ta: "ta-IN",
    };

    recognition.lang = micLangMap[locale] ?? "en-SG";

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setVoiceText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = () => setMicState("idle");
    recognition.onend = () => setMicState("idle");

    recognition.start();
    recognizerRef.current = recognition;
    setMicState("listening");
  }

  const reviewHref =
    lastResumeId != null
      ? `/resume/review?resume_id=${encodeURIComponent(lastResumeId)}`
      : "/resume/review";

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar rightSlot={<UserMenu />} />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            {t("nav_resume")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            {t("resume_page_hero_title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            {t("resume_page_hero_lead")}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StepPill number={1} label={t("resume_upload_card_title")} active={stage === 0 || stage === 1} complete={stage > 1} />
            <StepPill number={2} label={t("resume_analyse_button")} active={stage === 2} complete={stage > 2} />
            <StepPill number={3} label={t("resume_go_review")} active={stage === 3} />
          </div>

          {resumeStatus?.has_profile ? (
            <div className="mt-6">
              <StatusBanner tone="success">{t("resume_status_has_profile_banner")}</StatusBanner>
            </div>
          ) : resumeStatus?.has_resume ? (
            <div className="mt-6">
              <StatusBanner tone="warning">{t("resume_status_has_resume_banner")}</StatusBanner>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-navy-950">{t("resume_upload_card_title")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("resume_upload_card_intro")}
                </p>
              </div>
              <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 sm:block">
                {selectedFileName ? t("resume_selected_file") : t("resume_upload_card_title")}
              </div>
            </div>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void handleUpload();
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`group flex w-full flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-8 text-center transition ${
                  dragActive
                    ? "border-navy-950 bg-navy-50"
                    : selectedFileName
                      ? "border-emerald-300 bg-emerald-50/70 hover:border-emerald-400"
                      : "border-slate-300 bg-slate-50 hover:border-navy-950 hover:bg-white"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${
                    selectedFileName ? "bg-emerald-100 text-emerald-700" : "bg-white text-navy-950 shadow-sm"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                    <path
                      d="M12 16V4m0 0-4 4m4-4 4 4M5 16.5v1.25A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75V16.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <p className="mt-4 text-base font-semibold text-navy-950">
                  {selectedFileName || t("resume_upload_button")}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  PDF / DOCX
                </p>

                <span className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition group-hover:border-navy-950 group-hover:text-navy-950">
                  Choose File
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {error ? (
                <div className="mt-4">
                  <StatusBanner tone="error">{error}</StatusBanner>
                </div>
              ) : null}

              {stage === 2 ? (
                <div className="mt-4">
                  <StatusBanner tone="success">{t("upload_success_banner")}</StatusBanner>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="submit"
                  disabled={stage !== 1 || uploading || profiling}
                  className={`inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition ${
                    stage === 1 && !uploading && !profiling
                      ? "bg-navy-950 hover:-translate-y-0.5 hover:opacity-95"
                      : "bg-slate-300"
                  } disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60`}
                >
                  {uploading || profiling ? t("resume_processing") : t("resume_upload_button")}
                </button>

                <button
                  type="button"
                  disabled={uploading || profiling}
                  onClick={handleClear}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                >
                  {t("resume_clear_button")}
                </button>
              </div>
            </form>

            <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold text-slate-700">
                  {t("voice_describe_label")}
                </label>

                <button
                  type="button"
                  onClick={handleMicClick}
                  title={micState === "listening" ? "Stop recording" : "Start voice input"}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                    micState === "listening"
                      ? "animate-pulse border-red-300 bg-red-50 text-red-600"
                      : micState === "processing"
                        ? "border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-200 bg-white text-slate-600 hover:border-navy-950 hover:text-navy-950"
                  }`}
                >
                  {micState === "processing" ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6" />
                    </svg>
                  )}
                </button>
              </div>

              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder={t("voice_textarea_placeholder")}
                rows={5}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-navy-950"
              />

              <button
                type="button"
                onClick={() => void handleAnalyse()}
                disabled={stage !== 2 || analysing || translating}
                className={`mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
                  stage === 2 && !analysing && !translating
                    ? "bg-[#b88a44] text-white hover:-translate-y-0.5 hover:opacity-95"
                    : "bg-white border border-slate-200 text-slate-400"
                } disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60`}
              >
                {analysing ? t("resume_analysing_label") : t("resume_analyse_button")}
              </button>
            </div>

            {translating ? (
              <div className="mt-4">
                <StatusBanner tone="warning">{t("upload_step_translating")}</StatusBanner>
              </div>
            ) : null}

            {analysing ? (
              <div className="mt-4 rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-4">
                <div className="space-y-2">
                  {analysisSteps.map((step, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 text-sm transition-opacity duration-500 ${
                        i <= analysisStep ? "opacity-100" : "opacity-25"
                      }`}
                    >
                      {i < analysisStep ? (
                        <svg className="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : i === analysisStep ? (
                        <svg className="h-4 w-4 shrink-0 animate-spin text-[#b88a44]" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300 bg-white" />
                      )}
                      <span className={i === analysisStep ? "font-medium text-[#b88a44]" : "text-slate-500"}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {analysisError ? (
              <div className="mt-4">
                <StatusBanner tone="error">{analysisError}</StatusBanner>
              </div>
            ) : null}

            {stage === 3 && feedback ? (
              <div className="mt-4">
                <StatusBanner tone="success">
                  {t("upload_complete_banner").replace(
                    "{score}",
                    String(Math.min(100, Math.round((feedback.score / 10) * 100))),
                  )}
                </StatusBanner>
              </div>
            ) : null}

            <button
              type="button"
              disabled={stage !== 3}
              onClick={() => router.push(reviewHref)}
              className={`mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
                stage === 3
                  ? "bg-navy-950 text-white hover:-translate-y-0.5 hover:opacity-95"
                  : "border border-slate-200 bg-white text-slate-400"
              } disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60`}
            >
              {t("resume_go_review")}
            </button>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <h2 className="text-xl font-semibold text-navy-950">{t("resume_alt_option_title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("resume_alt_option_body")}</p>

              <Link
                href="/resume/voice"
                className="mt-5 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-navy-950 hover:bg-slate-50 hover:text-navy-950"
              >
                {t("nav_voice_resume")}
              </Link>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">{t("resume_journey_title")}</h2>
              <ol className="mt-5 space-y-4">
                {([
                  { labelKey: "resume_journey_step1_label", descKey: "resume_journey_step1_desc" },
                  { labelKey: "resume_journey_step2_label", descKey: "resume_journey_step2_desc" },
                  { labelKey: "resume_journey_step3_label", descKey: "resume_journey_step3_desc" },
                  { labelKey: "resume_journey_step4_label", descKey: "resume_journey_step4_desc" },
                ] as const).map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-2xl border border-transparent px-2 py-2 transition hover:border-slate-200 hover:bg-slate-50"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-950 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy-950">{t(step.labelKey)}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500">{t(step.descKey)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>

        {feedback ? (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-navy-950">{t("ai_feedback_title")}</h2>
              <span className="inline-flex items-end gap-1 rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-navy-950">
                {t("ai_score_label")} <span className="text-2xl">{feedback.score}</span>
                <span className="font-normal text-slate-400">/ 10</span>
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("ai_overall_impression")}
                </p>
                <p className="text-sm leading-6 text-slate-700">{feedback.overallImpression}</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  {t("ai_key_strengths")}
                </p>
                <ul className="space-y-1.5">
                  {feedback.keyStrengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
                  {t("ai_areas_to_improve")}
                </p>
                <ul className="space-y-1.5">
                  {feedback.areasToImprove.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("ai_suggested_edits")}
                </p>
                <ul className="space-y-1.5">
                  {feedback.suggestedEdits.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-navy-700">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {feedback.atsAnalysis ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 sm:col-span-2">
                  <div className="mb-3 flex items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {t("ai_ats_analysis")}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        feedback.atsAnalysis.atsFriendly
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {feedback.atsAnalysis.atsFriendly ? t("ai_ats_friendly") : t("ai_ats_not_friendly")}
                    </span>
                  </div>

                  {feedback.atsAnalysis.atsNotes ? (
                    <p className="mb-3 text-sm leading-6 text-slate-700">{feedback.atsAnalysis.atsNotes}</p>
                  ) : null}

                  {feedback.atsAnalysis.keywordsFound?.length ? (
                    <div className="mb-2">
                      <p className="mb-1.5 text-xs font-medium text-slate-500">{t("ai_keywords_found")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {feedback.atsAnalysis.keywordsFound.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {feedback.atsAnalysis.keywordsMissing?.length ? (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-500">{t("ai_keywords_missing")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {feedback.atsAnalysis.keywordsMissing.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {feedback.careerProgression ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("ai_career_progression")}
                  </p>
                  <p className="text-sm leading-6 text-slate-700">{feedback.careerProgression}</p>
                </div>
              ) : null}

              {feedback.salaryBenchmark ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("ai_salary_benchmark")}
                  </p>
                  <p className="text-lg font-semibold text-navy-950">
                    {feedback.salaryBenchmark.estimatedRange}
                  </p>
                  {feedback.salaryBenchmark.rationale ? (
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">
                      {feedback.salaryBenchmark.rationale}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-10 max-w-4xl">
          <ResumeList resumes={userResumes} onDeleted={handleResumeDeleted} className="mt-0" />
        </div>
      </section>
    </main>
  );
}

export default function ResumeOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8f8f6]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
        </div>
      }
    >
      <ResumeOnboardingContent />
    </Suspense>
  );
}