"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/providers/language-provider";

export type ContractFlowStep = "context" | "upload" | "workspace";

export function ContractFlowStepper({
  step,
  onStepChange,
}: {
  step: ContractFlowStep;
  onStepChange: (next: ContractFlowStep) => void;
}) {
  const { t } = useLanguage();
  const steps: { id: ContractFlowStep; label: string }[] = useMemo(
    () => [
      { id: "context", label: t("dash_flow_context") },
      { id: "upload", label: t("dash_flow_upload") },
      { id: "workspace", label: t("dash_flow_workspace") },
    ],
    [t],
  );
  const activeIndex = steps.findIndex((s) => s.id === step);
  return (
    <nav aria-label={t("dash_section_badge")} className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 sm:gap-3">
        {steps.map((s, i) => {
          const done = i < activeIndex;
          const current = s.id === step;
          return (
            <li key={s.id} className="flex items-center gap-2 sm:gap-3">
              {i > 0 ? (
                <span className="hidden text-slate-300 sm:inline" aria-hidden>
                  →
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onStepChange(s.id)}
                aria-current={current ? "step" : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                  current
                    ? "bg-navy-950 text-white ring-2 ring-navy-950 ring-offset-2 ring-offset-slate-50"
                    : done
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
