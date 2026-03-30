"use client";

import type { ClauseComparison } from "@/lib/types";
import { useLanguage } from "@/components/providers/language-provider";

const ASSESSMENT_STYLES: Record<
  string,
  { border: string; bg: string; dot: string; text: string }
> = {
  a_better: {
    border: "border-emerald-200",
    bg: "bg-emerald-50/50",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  b_better: {
    border: "border-blue-200",
    bg: "bg-blue-50/50",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  equal: {
    border: "border-slate-200",
    bg: "bg-slate-50/50",
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
  different: {
    border: "border-amber-200",
    bg: "bg-amber-50/50",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
};

const VERDICT_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  compliant: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  caution: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  violated: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
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
  const { t } = useLanguage();

  const labelFor = (assessment: string) => {
    switch (assessment) {
      case "a_better":
        return t("compare_clause_a_better");
      case "b_better":
        return t("compare_clause_b_better");
      case "different":
        return t("compare_clause_different");
      default:
        return t("compare_clause_equal");
    }
  };

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
                {labelFor(c.assessment)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
              {(() => {
                const vA = c.verdict_a ? VERDICT_STYLES[c.verdict_a] : null;
                const vB = c.verdict_b ? VERDICT_STYLES[c.verdict_b] : null;

                return (
                  <>
                    <div className={`${vA ? vA.bg + ' ' + vA.text : 'bg-white/60 text-slate-700'} p-3 rounded border border-current/5`}>
                      <span className="block text-[10px] uppercase tracking-wider opacity-60 mb-1 font-medium italic">
                        {labelA} {vA ? `(${c.verdict_a})` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {vA && <span className={`h-1.5 w-1.5 rounded-full ${vA.dot}`} />}
                        <span>{c.contract_a_value ?? t("compare_not_found")}</span>
                      </div>
                    </div>
                    <div className={`${vB ? vB.bg + ' ' + vB.text : 'bg-white/60 text-slate-700'} p-3 rounded border border-current/5`}>
                      <span className="block text-[10px] uppercase tracking-wider opacity-60 mb-1 font-medium italic">
                        {labelB} {vB ? `(${c.verdict_b})` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {vB && <span className={`h-1.5 w-1.5 rounded-full ${vB.dot}`} />}
                        <span>{c.contract_b_value ?? t("compare_not_found")}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{c.explanation}</p>
          </div>
        );
      })}
    </div>
  );
}
