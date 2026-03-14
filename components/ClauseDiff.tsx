"use client";

import type { ClauseComparison } from "@/lib/types";

const ASSESSMENT_STYLES: Record<string, { border: string; bg: string; dot: string; label: string; text: string }> = {
  a_better: {
    border: "border-emerald-200",
    bg: "bg-emerald-50/50",
    dot: "bg-emerald-500",
    label: "Contract A Better",
    text: "text-emerald-700",
  },
  b_better: {
    border: "border-blue-200",
    bg: "bg-blue-50/50",
    dot: "bg-blue-500",
    label: "Contract B Better",
    text: "text-blue-700",
  },
  equal: {
    border: "border-slate-200",
    bg: "bg-slate-50/50",
    dot: "bg-slate-400",
    label: "Equal",
    text: "text-slate-600",
  },
  different: {
    border: "border-amber-200",
    bg: "bg-amber-50/50",
    dot: "bg-amber-500",
    label: "Different",
    text: "text-amber-700",
  },
};

const DEFAULT_STYLE = ASSESSMENT_STYLES.equal;

export function ClauseDiff({
  clauses,
  labelA,
  labelB,
}: {
  clauses: ClauseComparison[];
  labelA: string;
  labelB: string;
}) {
  return (
    <div className="space-y-3">
      {clauses.map((c, i) => {
        const style = ASSESSMENT_STYLES[c.assessment] ?? DEFAULT_STYLE;
        return (
          <div key={i} className={`rounded-lg border p-4 ${style.border} ${style.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif font-bold text-sm text-navy-900 flex items-center gap-2">
                <span className={`block h-2.5 w-2.5 rounded-full ${style.dot}`} />
                {c.clause_topic}
              </h4>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.text} bg-white/70`}
              >
                {style.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
              <div className="bg-white/60 p-3 rounded border border-current/5">
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-medium">
                  {labelA}
                </span>
                <span className="text-slate-700">{c.contract_a_value ?? "Not found"}</span>
              </div>
              <div className="bg-white/60 p-3 rounded border border-current/5">
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-medium">
                  {labelB}
                </span>
                <span className="text-slate-700">{c.contract_b_value ?? "Not found"}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{c.explanation}</p>
          </div>
        );
      })}
    </div>
  );
}
