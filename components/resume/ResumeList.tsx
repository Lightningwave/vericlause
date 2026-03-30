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
  className?: string;
}

export function ResumeList({ resumes, onDeleted, className = "mt-8" }: ResumeListProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const allSelected = resumes.length > 0 && selected.size === resumes.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(resumes.map((r) => r.id)));
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const ids = Array.from(selected);
    await Promise.all(ids.map((id) => deleteResumeById(id)));
    ids.forEach((id) => onDeleted(id));
    setSelected(new Set());
    setConfirmingBulkDelete(false);
    setBulkDeleting(false);
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-navy-900">
          {t("resume_history_heading")}
        </h3>
        {resumes.length > 0 ? (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-xs font-medium text-slate-500 hover:text-navy-950"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        ) : null}
      </div>

      {resumes.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          <span className="block">{t("resume_history_empty")}</span>
          <span className="mt-1 block text-slate-500">{t("resume_history_empty_hint")}</span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {resumes.map((resume) => {
          const date = new Date(resume.created_at).toLocaleDateString("en-SG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const analyzed = resume.parsed_profile != null;
          const score = analyzed ? deriveIndicatorScore(resume.ai_suggestions ?? undefined) : null;
          const isSelected = selected.has(resume.id);

          return (
            <div
              key={resume.id}
              className={`relative rounded-lg border bg-white p-3 shadow-sm transition-all ${
                isSelected ? "border-navy-950 ring-1 ring-navy-950" : "border-slate-200"
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(resume.id)}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-2 top-2 h-4 w-4 cursor-pointer accent-navy-950"
              />

              {/* Card content — clickable area */}
              <button
                type="button"
                onClick={() =>
                  router.push(`/resume/review?resume_id=${encodeURIComponent(resume.id)}`)
                }
                className="mt-4 w-full text-left"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-50">
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
                <p className="mt-2 truncate text-xs font-medium text-navy-950">{resume.file_name}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{date}</p>
                <div className="mt-2">
                  {analyzed && score != null ? (
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
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {t("dash_resume_not_analyzed")}
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Bulk delete action bar */}
      {selected.size > 0 ? (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-navy-950">{selected.size}</span> selected
          </span>

          {confirmingBulkDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Are you sure? This cannot be undone.</span>
              <button
                type="button"
                onClick={() => setConfirmingBulkDelete(false)}
                disabled={bulkDeleting}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBulkDelete()}
                disabled={bulkDeleting}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {bulkDeleting ? "Deleting…" : "Confirm"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingBulkDelete(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                  clipRule="evenodd"
                />
              </svg>
              Delete selected
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
