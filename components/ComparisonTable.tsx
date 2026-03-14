"use client";

import type { KeyTermComparison } from "@/lib/types";

const ASSESSMENT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  a_better: { bg: "bg-emerald-100", text: "text-emerald-800", label: "A Better" },
  b_better: { bg: "bg-blue-100", text: "text-blue-800", label: "B Better" },
  equal: { bg: "bg-slate-100", text: "text-slate-700", label: "Equal" },
  different: { bg: "bg-amber-100", text: "text-amber-800", label: "Different" },
};

export function ComparisonTable({
  terms,
  labelA,
  labelB,
}: {
  terms: KeyTermComparison[];
  labelA: string;
  labelB: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-4 py-3 font-serif font-bold text-navy-900 text-xs uppercase tracking-wider">
              Term
            </th>
            <th className="text-left px-4 py-3 font-serif font-bold text-navy-900 text-xs uppercase tracking-wider">
              {labelA}
            </th>
            <th className="text-left px-4 py-3 font-serif font-bold text-navy-900 text-xs uppercase tracking-wider">
              {labelB}
            </th>
            <th className="text-center px-4 py-3 font-serif font-bold text-navy-900 text-xs uppercase tracking-wider">
              Assessment
            </th>
          </tr>
        </thead>
        <tbody>
          {terms.map((t, i) => {
            const style = ASSESSMENT_STYLES[t.assessment] ?? ASSESSMENT_STYLES.equal;
            return (
              <tr key={i} className="border-b border-slate-100 last:border-none">
                <td className="px-4 py-3 font-medium text-slate-800">{t.term}</td>
                <td className="px-4 py-3 text-slate-700">{t.contract_a_value ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">{t.contract_b_value ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.bg} ${style.text}`}
                  >
                    {style.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
