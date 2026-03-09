"use client";

import type { ComplianceVerdict } from "@/lib/api";

export function VerdictBadge({ verdict }: { verdict: ComplianceVerdict }) {
  const styles =
    verdict.verdict === "compliant"
      ? "bg-emerald-50 border-emerald-100 text-emerald-900"
      : verdict.verdict === "caution"
        ? "bg-amber-50 border-amber-100 text-amber-900"
        : "bg-red-50 border-red-100 text-red-900";

  const icon =
    verdict.verdict === "compliant" ? "✓" : verdict.verdict === "caution" ? "!" : "✕";

  const labelColor = 
    verdict.verdict === "compliant" ? "text-emerald-700" : verdict.verdict === "caution" ? "text-amber-700" : "text-red-700";

  return (
    <div className={`rounded-lg border p-5 ${styles}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="font-serif font-bold text-lg capitalize tracking-tight flex items-center gap-2">
          <span className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs ${labelColor} border-current bg-white/50`}>
            {icon}
          </span>
          {verdict.clause_type.replace(/_/g, " ")}
        </h4>
        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/60 ${labelColor}`}>
          {verdict.verdict}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
        {verdict.contract_value && (
          <div className="bg-white/50 p-3 rounded border border-current/10">
            <span className="block text-xs uppercase tracking-wider opacity-70 mb-1">Contract Says</span>
            <span className="font-medium">{verdict.contract_value}</span>
          </div>
        )}
        {verdict.law_value && (
          <div className="bg-white/50 p-3 rounded border border-current/10">
            <span className="block text-xs uppercase tracking-wider opacity-70 mb-1">Law Requires</span>
            <span className="font-medium">{verdict.law_value}</span>
          </div>
        )}
      </div>

      {verdict.explanation && (
        <p className="text-sm leading-relaxed opacity-90 border-t border-current/10 pt-3">
          {verdict.explanation}
        </p>
      )}
      
      {verdict.citation && (
        <p className="mt-2 text-xs opacity-60 font-medium">
          Source: {verdict.citation}
        </p>
      )}
    </div>
  );
}
