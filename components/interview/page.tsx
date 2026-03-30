"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";
import AzureAvatarStage from "@/components/interview/AzureAvatarStage";

type AgentState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export default function InterviewPage() {
  const { t, locale } = useLanguage();
  const safeLocale =
    locale === "en" || locale === "zh" || locale === "ms" || locale === "ta"
      ? locale
      : "en";

  const [agentState, setAgentState] = useState<AgentState>("idle");

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={
          <Link
            href="/resume"
            className="rounded-md bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("nav_dashboard")}
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            {t("nav_interview")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            AI Interview Agent
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Practice with a live Azure avatar interviewer.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-navy-950">Avatar Stage</h2>

            <div className="h-[620px]">
              <AzureAvatarStage
                locale={safeLocale}
                onAgentStateChange={(state) => setAgentState(state)}
              />
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-navy-950">Session Status</h2>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Agent State
              </p>
              <p className="mt-2 text-2xl font-semibold text-navy-950">{agentState}</p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                What to do next
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <p>• Click Connect Avatar.</p>
                <p>• Wait for the state to change to listening.</p>
                <p>• Click Demo Speak to test the avatar voice.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}