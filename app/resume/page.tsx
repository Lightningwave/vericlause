"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { ResumeList } from "@/components/resume/ResumeList";
import { useLanguage } from "@/components/providers/language-provider";
import { useResumeStatus } from "@/components/providers/resume-status-provider";
import { createClient } from "@/lib/supabase/client";
import { getProfileJob, listResumes, profileResume, uploadResume, type ResumeSummary } from "@/lib/api";
import type { ResumeProfile } from "@/lib/types";
import type { ResumeFeedback } from "@/app/api/resume/route";

export default function ResumeOnboardingPage() {
  const { t } = useLanguage();
  const { status: resumeStatus, refetch: refetchResumeStatus } = useResumeStatus();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [profiling, setProfiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastResumeId, setLastResumeId] = useState<string | null>(null);
  const [userResumes, setUserResumes] = useState<ResumeSummary[]>([]);

  // AI feedback state
  const [feedback, setFeedback] = useState<ResumeFeedback | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Voice-to-text state
  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const [voiceText, setVoiceText] = useState("");
  const recognizerRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      void listResumes()
        .then((r) => setUserResumes(r.resumes))
        .catch(() => setUserResumes([]));
    });
  }, []);

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
    setSuccessMessage(null);
    setFeedback(null);
    setAnalysisError(null);
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setFile(file);
  }

  function handleClear() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleUpload = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);

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
      const { resume_id, raw_text_length } = uploadResult;
      setLastResumeId(null);
      setSuccessMessage(
        t("resume_upload_progress").replace("{n}", raw_text_length.toLocaleString()),
      );
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
        } catch {
          /* ignore */
        }
        setSuccessMessage(t("resume_success_profiled"));
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
          } catch {
            /* ignore */
          }
          setSuccessMessage(t("resume_success_profiled"));
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
      } catch {
        /* ignore */
      }
      setLastResumeId(resume_id);
      setSuccessMessage(t("resume_profiling_timeout"));
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

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("voiceText", voiceText);

      const res = await fetch("/api/resume", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setAnalysisError(json.detail ?? "Something went wrong. Please try again.");
        return;
      }

      setFeedback(json.feedback as ResumeFeedback);
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
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setVoiceText((prev) => (prev ? prev + " " + transcript : transcript));
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
      <SiteNavbar
        rightSlot={
          <button
            type="button"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/");
              router.refresh();
            }}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-navy-950"
          >
            {t("dash_sign_out")}
          </button>
        }
      />

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
          {resumeStatus?.has_profile ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {t("resume_status_has_profile_banner")}
            </p>
          ) : resumeStatus?.has_resume ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("resume_status_has_resume_banner")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-navy-950">{t("resume_upload_card_title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("resume_upload_card_intro")}</p>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void handleUpload();
              }}
            >
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="block flex-1 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-navy-700 hover:file:bg-navy-100"
                />
                <button
                  type="button"
                  onClick={() => void handleMicClick()}
                  title={micState === "listening" ? "Stop recording" : "Start voice input"}
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition ${
                    micState === "listening"
                      ? "animate-pulse border-red-300 bg-red-50 text-red-600"
                      : micState === "processing"
                      ? "border-slate-200 bg-slate-50 text-slate-400"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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

              {selectedFileName ? (
                <p className="mt-3 text-sm font-medium text-navy-950">
                  {t("resume_selected_file")}: {selectedFileName}
                </p>
              ) : null}

              {error ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              ) : null}
              {successMessage ? (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {successMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={uploading || profiling || !selectedFile}
                className="mt-4 w-full rounded-xl bg-navy-950 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading || profiling ? t("resume_processing") : t("resume_upload_button")}
              </button>
            </form>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Or describe your experience verbally
              </label>
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="Your spoken input will appear here..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-navy-950"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleAnalyse()}
              disabled={!selectedFile || analysing}
              className="mt-4 w-full rounded-xl border border-[#b88a44] px-4 py-3 text-sm font-medium text-[#b88a44] transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analysing ? "Analysing..." : "Analyse My Resume"}
            </button>

            {analysisError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {analysisError}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={uploading || profiling}
                onClick={handleClear}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {t("resume_clear_button")}
              </button>
            </div>

            <Link
              href={reviewHref}
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t("resume_go_review")}
            </Link>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">{t("resume_alt_option_title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("resume_alt_option_body")}</p>

              <Link
                href="/resume/voice"
                className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("nav_voice_resume")}
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">{t("resume_what_next_title")}</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>• {t("resume_what_next_1")}</p>
                <p>• {t("resume_what_next_2")}</p>
                <p>• {t("resume_what_next_3")}</p>
              </div>
            </div>
          </aside>
        </div>

        {/* AI Feedback section */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-navy-950">AI Feedback</h2>
            {feedback && (
              <span className="text-sm font-semibold text-navy-950">
                Score: <span className="text-2xl">{feedback.score}</span>
                <span className="font-normal text-slate-400"> / 10</span>
              </span>
            )}
          </div>

          {!feedback ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-500">
                Upload a file and click &ldquo;Analyse My Resume&rdquo; to see AI-powered feedback here.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {["Overall Impression", "Key Strengths", "Areas to Improve", "Suggested Edits"].map((section) => (
                  <div key={section} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{section}</p>
                    <div className="mt-2 h-3 w-3/4 rounded bg-slate-200" />
                    <div className="mt-1.5 h-3 w-1/2 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Overall Impression
                </p>
                <p className="text-sm leading-6 text-slate-700">{feedback.overallImpression}</p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Key Strengths
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

              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Areas to Improve
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

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Suggested Edits
                </p>
                <ul className="space-y-1.5">
                  {feedback.suggestedEdits.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[10px] font-bold text-navy-700">
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

        <div className="mt-10 max-w-3xl">
          <ResumeList resumes={userResumes} onDeleted={handleResumeDeleted} className="mt-0" />
        </div>
      </section>
    </main>
  );
}
