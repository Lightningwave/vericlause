"use client";

export function ComplianceScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  // Use professional palette: Emerald, Amber, Red (slightly muted/darker)
  const color =
    score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-500" : "text-red-600";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-100"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={color}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-serif text-3xl font-bold text-navy-950">{Math.round(score)}%</span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Score</span>
      </div>
    </div>
  );
}
