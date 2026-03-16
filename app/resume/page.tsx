"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

export default function ResumeOnboardingPage() {
  const { t } = useLanguage();
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteNavbar
        links={[
          { href: "/", label: "nav_home" },
          { href: "/resume", label: "nav_resume" },
          { href: "#faq", label: "nav_faq" },
        ]}
        rightSlot={
          <Link
            href="/auth/sign-in"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
          >
            {t("sign_in")}
          </Link>
        }
      />

      <main className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-600">
            {t("resume_onboarding_badge")}
          </p>

          <h1 className="font-serif text-4xl font-bold text-navy-950 md:text-5xl">
            {t("resume_onboarding_title")}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            {t("resume_onboarding_description")}
          </p>
        </section>

        <section className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6">
              <h2 className="font-serif text-2xl font-bold text-navy-950">
                {t("resume_upload_title")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("resume_upload_description")}
              </p>
            </div>

            <label
              htmlFor="resume-upload"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
                isDragging
                  ? "border-gold-400 bg-gold-50"
                  : "border-slate-300 bg-slate-50 hover:border-gold-300 hover:bg-gold-50/40"
              }`}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy-950 text-white">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    d="M12 16V8m0 0-3 3m3-3 3 3M7 17.5h10A2.5 2.5 0 0 0 19.5 15V8.75A2.75 2.75 0 0 0 16.75 6H15.8A4 4 0 0 0 8.2 6h-.95A2.75 2.75 0 0 0 4.5 8.75V15A2.5 2.5 0 0 0 7 17.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <p className="text-base font-semibold text-navy-950">
                {t("resume_upload_dropzone_title")}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {t("resume_upload_dropzone_hint")}
              </p>

              <p className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600">
                {t("resume_upload_supported_formats")}
              </p>

              {selectedFileName ? (
                <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {t("resume_selected_file")}: {selectedFileName}
                </div>
              ) : null}

              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-800"
              >
                {t("resume_upload_button")}
              </button>

              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
              >
                {t("resume_clear_button")}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M7.5 5.75h7.086a1 1 0 0 1 .707.293l2.664 2.664a1 1 0 0 1 .293.707v8.836A1.75 1.75 0 0 1 16.5 20h-9A1.75 1.75 0 0 1 5.75 18.25V7.5A1.75 1.75 0 0 1 7.5 5.75Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M14.75 5.75v3.5h3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>

              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("resume_build_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("resume_build_description")}
              </p>

              <button
                type="button"
                className="mt-5 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
              >
                {t("resume_build_button")}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-navy-100 text-navy-900">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M12 15.5A3.5 3.5 0 0 0 15.5 12V8A3.5 3.5 0 1 0 8.5 8v4A3.5 3.5 0 0 0 12 15.5Zm0 0v3m-3 0h6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("resume_voice_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("resume_voice_description")}
              </p>

              <button
                type="button"
                disabled
                className="mt-5 w-full cursor-not-allowed rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-400"
              >
                {t("resume_voice_button")}
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="font-serif text-lg font-bold text-emerald-800">
                {t("resume_tip_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-700">
                {t("resume_tip_description")}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 md:flex-row">
          <p className="text-sm text-slate-500">{t("resume_continue_note")}</p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/"
              className="rounded-md border border-slate-200 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
            >
              {t("resume_back_home")}
            </Link>

            <button
              type="button"
              className="rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-800"
            >
              {t("resume_continue_button")}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}