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

  const reviewHref =
    lastResumeId != null
      ? `/resume/review?resume_id=${encodeURIComponent(lastResumeId)}`
      : "/resume/review";

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={
          <Link
            href="/contract"
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-navy-700 hover:file:bg-navy-100"
              />

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
