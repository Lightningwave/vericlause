"use client";

import type { BenchmarkResult } from "@/lib/types";

const ASSESSMENT_STYLES = {
  above: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    barColor: "bg-emerald-500",
    label: "Above Market",
  },
  at: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    barColor: "bg-blue-500",
    label: "At Market",
  },
  below: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    barColor: "bg-red-500",
    label: "Below Market",
  },
};

export function BenchmarkPanel({ result }: { result: BenchmarkResult }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-navy-950 mb-1">
          Market Benchmark: {result.job_title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">{result.overall_summary}</p>
        <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          Indicative estimates based on Singapore market data
        </p>
      </div>

      {result.items.map((item, i) => {
        const style = ASSESSMENT_STYLES[item.assessment] ?? ASSESSMENT_STYLES.at;
        return (
          <div
            key={i}
            className={`rounded-lg border p-4 ${style.bg} ${style.border}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif font-bold text-sm text-navy-900">{item.term}</h4>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.text} bg-white/70`}>
                {style.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div className="bg-white/60 p-2.5 rounded">
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Your Contract</span>
                <span className="font-medium text-slate-800">{item.contract_value ?? "N/A"}</span>
              </div>
              <div className="bg-white/60 p-2.5 rounded">
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Market Range</span>
                <span className="font-medium text-slate-800">{item.market_range}</span>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-white/60 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full ${style.barColor} transition-all`}
                style={{
                  width: item.assessment === "above" ? "85%" : item.assessment === "at" ? "50%" : "20%",
                }}
              />
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">{item.explanation}</p>
          </div>
        );
      })}
    </div>
  );
}
