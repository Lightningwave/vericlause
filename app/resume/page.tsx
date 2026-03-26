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
  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const [voiceText, setVoiceText] = useState("");
  const recognizerRef = useRef<{
    stopContinuousRecognitionAsync: (cb?: () => void, err?: (e: string) => void) => void;
  } | null>(null);

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

  async function handleMicClick() {
    if (micState === "listening") {
      recognizerRef.current?.stopContinuousRecognitionAsync(
        () => setMicState("idle"),
        () => setMicState("idle"),
      );
      return;
    }

    setMicState("processing");
    try {
      const res = await fetch("/api/speech");
      if (!res.ok) throw new Error("Failed to get speech token");
      const { token, region } = await res.json();

      const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "en-SG";
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizerRef.current = recognizer;

      recognizer.recognized = (_: unknown, e: { result: { reason: number; text: string } }) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
          setVoiceText((prev) => (prev ? prev + " " + e.result.text : e.result.text));
        }
      };

      recognizer.startContinuousRecognitionAsync(
        () => setMicState("listening"),
        (err: string) => {
          console.error("Speech recognition error:", err);
          setMicState("idle");
        },
      );
    } catch (err) {
      console.error("Mic setup failed:", err);
      setMicState("idle");
    }
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

        <div className="mt-10 max-w-3xl">
          <ResumeList resumes={userResumes} onDeleted={handleResumeDeleted} className="mt-0" />
        </div>
      </section>
    </main>
  );
}
