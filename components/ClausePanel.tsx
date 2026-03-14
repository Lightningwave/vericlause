"use client";

import { useRef, useEffect } from "react";
import type { ComplianceVerdict, ContractClause } from "@/lib/types";

interface ClausePanelProps {
  clauses: ContractClause[];
  verdicts: ComplianceVerdict[];
  activeClause: string | null;
  onClauseClick: (clauseTitle: string) => void;
  showTranslation?: boolean;
}

function verdictForClause(
  clauseTitle: string,
  verdicts: ComplianceVerdict[],
): ComplianceVerdict | undefined {
  const normalized = clauseTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
  return verdicts.find((v) => {
    const vNorm = v.clause_type.toLowerCase().replace(/[^a-z0-9]/g, "");
    return vNorm === normalized || vNorm.includes(normalized) || normalized.includes(vNorm);
  });
}

const VERDICT_STYLES: Record<string, { border: string; bg: string; dot: string; label: string }> = {
  compliant: {
    border: "border-emerald-200",
    bg: "bg-emerald-50/50",
    dot: "bg-emerald-500",
    label: "text-emerald-700",
  },
  caution: {
    border: "border-amber-200",
    bg: "bg-amber-50/50",
    dot: "bg-amber-500",
    label: "text-amber-700",
  },
  violated: {
    border: "border-red-200",
    bg: "bg-red-50/50",
    dot: "bg-red-500",
    label: "text-red-700",
  },
};

const DEFAULT_STYLE = {
  border: "border-slate-200",
  bg: "bg-slate-50/50",
  dot: "bg-slate-400",
  label: "text-slate-500",
};

export function ClausePanel({ clauses, verdicts, activeClause, onClauseClick, showTranslation }: ClausePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clauseRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (activeClause) {
      const el = clauseRefs.current.get(activeClause);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeClause]);

  return (
    <div ref={containerRef} className="h-full overflow-auto space-y-3 pr-1">
      {clauses.map((clause, i) => {
        const v = verdictForClause(clause.clause_title, verdicts);
        const style = v ? (VERDICT_STYLES[v.verdict] ?? DEFAULT_STYLE) : DEFAULT_STYLE;
        const isActive = activeClause === clause.clause_title;

        return (
          <div
            key={i}
            ref={(el) => {
              if (el) clauseRefs.current.set(clause.clause_title, el);
            }}
            onClick={() => onClauseClick(clause.clause_title)}
            className={`rounded-lg border p-4 cursor-pointer transition-all ${style.border} ${style.bg} ${
              isActive ? "ring-2 ring-navy-400 shadow-md" : "hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-serif font-bold text-sm text-navy-900 flex items-center gap-2">
                <span className={`block h-2.5 w-2.5 rounded-full ${style.dot}`} />
                {clause.clause_title}
              </h4>
              {v && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.label} bg-white/70`}>
                  {v.verdict}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
              {clause.clause_text}
            </p>
            {clause.locations?.[0] && (
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Source page {clause.locations[0].page_number}
              </p>
            )}
            {v?.explanation && (
              <p className={`mt-2 text-xs font-medium ${style.label} border-t border-current/10 pt-2`}>
                {showTranslation && v.translated_explanation ? v.translated_explanation : v.explanation}
              </p>
            )}
            {v?.citation && (
              <p className="mt-1 text-[10px] text-slate-400 font-medium">
                {v.citation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
