"use client";

import {
  estimateProgressPercent,
  estimateRemainingFromServerProgress,
  estimateRemainingSeconds,
} from "@/lib/contract/estimate-analysis-time";
import { useLanguage } from "@/components/providers/language-provider";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Phase = "uploading" | "analyzing";

function stageTranslationKey(stage: string): string {
  return `dash_contract_progress_stage_${stage}`;
}

export function ContractAnalysisProgress({
  phase,
  fileSizeBytes,
  elapsedSeconds,
  serverProgress,
  serverStage,
}: {
  phase: Phase;
  fileSizeBytes: number;
  elapsedSeconds: number;
  /** 0–100 from analysis_jobs while analyzing; omit during upload */
  serverProgress?: number | null;
  serverStage?: string | null;
}) {
  const { t } = useLanguage();

  /** Use server bar whenever we have a positive reading (including 100 while UI still shows analyzing). */
  const useServer =
    phase === "analyzing" && serverProgress != null && serverProgress > 0;

  const heuristicRemaining = estimateRemainingSeconds(fileSizeBytes, elapsedSeconds);
  const heuristicPct = estimateProgressPercent(fileSizeBytes, elapsedSeconds);

  const serverRemaining =
    useServer && serverProgress < 100
      ? estimateRemainingFromServerProgress(serverProgress, elapsedSeconds)
      : null;

  const remaining =
    useServer && serverProgress < 100 && serverRemaining != null
      ? serverRemaining
      : heuristicRemaining;

  const pct = useServer ? Math.min(100, serverProgress) : heuristicPct;

  const phaseLabel =
    phase === "uploading" ? t("dash_contract_progress_uploading") : t("dash_contract_progress_analyzing");

  const stageHint =
    useServer && serverStage
      ? (() => {
          const key = stageTranslationKey(serverStage);
          const translated = t(key);
          return translated === key ? serverStage : translated;
        })()
      : null;

  const etaText =
    useServer && serverProgress != null && serverProgress >= 95
      ? t("dash_contract_progress_eta_last")
      : remaining > 0
        ? t("dash_contract_progress_eta").replace("{{s}}", String(remaining))
        : t("dash_contract_progress_eta_last");

  return (
    <div className="w-full max-w-md space-y-5">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-navy-800 to-navy-950 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-800">{phaseLabel}</p>
        {stageHint ? (
          <p className="mt-1 text-xs text-slate-500">{stageHint}</p>
        ) : null}
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("dash_contract_progress_hint")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          {t("dash_contract_progress_elapsed")}:{" "}
          <span className="font-mono font-medium text-slate-700">{formatClock(elapsedSeconds)}</span>
        </span>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span>{etaText}</span>
      </div>
    </div>
  );
}
