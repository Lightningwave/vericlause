"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ResumeSummary } from "@/lib/api";
import { deleteResumeById } from "@/lib/api";
import { useLanguage } from "@/components/providers/language-provider";
import type { ResumeSuggestion } from "@/lib/types";

function deriveIndicatorScore(suggestions: ResumeSuggestion[] | null | undefined): number {
  if (!suggestions?.length) return 78;
  let penalty = 0;
  for (const s of suggestions) {
    if (s.type === "critical_fix") penalty += 14;
    else if (s.priority === "high") penalty += 10;
    else if (s.priority === "medium") penalty += 5;
    else penalty += 2;
  }
  return Math.max(42, Math.min(96, Math.round(96 - penalty)));
}

interface ResumeListProps {
  resumes: ResumeSummary[];
  onDeleted: (resumeId: string) => void;
  /** Extra top margin (e.g. false when first block on page section). */
  className?: string;
}

export function ResumeList({ resumes, onDeleted, className = "mt-8" }: ResumeListProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, resumeId: string) => {
    e.stopPropagation();
    if (!confirm(t("dash_resume_delete_confirm"))) return;
    setDeletingId(resumeId);
    const ok = await deleteResumeById(resumeId);
    if (ok) onDeleted(resumeId);
    setDeletingId(null);
  };

  return (
    <div className={className}>
      <h3 className="mb-3 font-serif text-sm font-bold uppercase tracking-wider text-navy-900">
        {t("resume_history_heading")}
      </h3>
      {resumes.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          <span className="block">{t("resume_history_empty")}</span>
          <span className="mt-1 block text-slate-500">{t("resume_history_empty_hint")}</span>
        </p>
      ) : null}
      <div className="space-y-2">
        {resumes.map((resume) => {
          const date = new Date(resume.created_at).toLocaleDateString("en-SG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const isDeleting = deletingId === resume.id;
          const analyzed = resume.parsed_profile != null;
          const score = analyzed ? deriveIndicatorScore(resume.ai_suggestions ?? undefined) : null;

          return (
            <button
              key={resume.id}
              type="button"
              onClick={() => router.push(`/resume/review?resume_id=${encodeURIComponent(resume.id)}`)}
              disabled={isDeleting}
              className="group w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-navy-300 hover:shadow-md disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-navy-50">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-navy-600" aria-hidden="true">
                      <path
                        d="M8 3.75h6.586a1 1 0 0 1 .707.293l3.664 3.664a1 1 0 0 1 .293.707V19.25A1.75 1.75 0 0 1 17.5 21h-9A1.75 1.75 0 0 1 6.75 19.25v-13.75A1.75 1.75 0 0 1 8.5 3.75Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M14.75 3.75v4.5h4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-950">{resume.file_name}</p>
                    <p className="text-[11px] text-slate-400">{date}</p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {analyzed && score != null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        score >= 80
                          ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                          : score >= 55
                            ? "border border-amber-100 bg-amber-50 text-amber-700"
                            : "border border-red-100 bg-red-50 text-red-700"
                      }`}
                    >
                      {score}%
                    </span>
                  )}
                  {!analyzed && (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {t("dash_resume_not_analyzed")}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, resume.id)}
                    disabled={isDeleting}
                    className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    title={t("dash_resume_delete_title")}
                  >
                    {isDeleting ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border border-slate-300 border-t-slate-500" />
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
