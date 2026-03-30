"use client";

import type { KeyTermComparison } from "@/lib/types";
import { useLanguage } from "@/components/providers/language-provider";

const ASSESSMENT_STYLES: Record<string, { bg: string; text: string }> = {
  a_better: { bg: "bg-emerald-100", text: "text-emerald-800" },
  b_better: { bg: "bg-blue-100", text: "text-blue-800" },
  equal: { bg: "bg-slate-100", text: "text-slate-700" },
  different: { bg: "bg-amber-100", text: "text-amber-800" },
};

const VERDICT_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  compliant: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  caution: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  violated: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
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
  const { t } = useLanguage();

  const labelFor = (assessment: string) => {
    switch (assessment) {
      case "a_better":
        return t("compare_assess_a_better");
      case "b_better":
        return t("compare_assess_b_better");
      case "different":
        return t("compare_assess_different");
      default:
        return t("compare_assess_equal");
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-4 py-3 font-serif font-bold text-navy-900 text-xs uppercase tracking-wider">
              {t("compare_table_term")}
            </th>
            <th className="text-left px-4 py-3 font-serif font-bold text-navy-900 text-xs uppercase tracking-wider">
              {labelA}
            </th>
            <th className="text-left px-4 py-3 font-serif font-bold text-navy-900 text-xs uppercase tracking-wider">
              {labelB}
            </th>
            <th className="text-center px-4 py-3 font-serif font-bold text-navy-900 text-xs uppercase tracking-wider">
              {t("compare_table_assessment")}
            </th>
          </tr>
        </thead>
        <tbody>
          {terms.map((row, i) => {
            const style = ASSESSMENT_STYLES[row.assessment] ?? ASSESSMENT_STYLES.equal;
            const vA = row.verdict_a ? VERDICT_STYLES[row.verdict_a] : null;
            const vB = row.verdict_b ? VERDICT_STYLES[row.verdict_b] : null;

            return (
              <tr key={i} className="border-b border-slate-100 last:border-none">
                <td className="px-4 py-3 font-medium text-slate-800">{row.term}</td>
                <td className={`px-4 py-3 ${vA ? vA.bg + ' ' + vA.text : 'text-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    {vA && <span className={`h-1.5 w-1.5 rounded-full ${vA.dot}`} />}
                    {row.contract_a_value ?? "—"}
                  </div>
                </td>
                <td className={`px-4 py-3 ${vB ? vB.bg + ' ' + vB.text : 'text-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    {vB && <span className={`h-1.5 w-1.5 rounded-full ${vB.dot}`} />}
                    {row.contract_b_value ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.bg} ${style.text}`}
                  >
                    {labelFor(row.assessment)}
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
