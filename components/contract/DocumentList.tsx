"use client";

import { useState } from "react";
import { Trash2, FileText } from "lucide-react";
import { deleteDocument, type DocumentSummary } from "@/lib/api";
import { useLanguage } from "@/components/providers/language-provider";
import type { Locale } from "@/lib/i18n/types";

interface DocumentListProps {
  documents: DocumentSummary[];
  onSelect: (doc: DocumentSummary) => void;
  onDeleted?: (docId: string) => void;
}

function dateLocaleForUi(locale: Locale): string {
  const map: Record<Locale, string> = {
    en: "en-SG",
    zh: "zh-SG",
    ms: "ms-SG",
    ta: "ta-SG",
  };
  return map[locale];
}

export function DocumentList({
  documents,
  onSelect,
  onDeleted,
}: DocumentListProps) {
  const { t, locale } = useLanguage();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(
    e: React.MouseEvent<HTMLButtonElement>,
    doc: DocumentSummary,
  ) {
    e.stopPropagation();

    if (deletingId) return;

    const confirmed = window.confirm(
      t("docs_delete_confirm") || "Delete this contract?",
    );
    if (!confirmed) return;

    try {
      setDeletingId(doc.id);
      await deleteDocument(doc.id);
      onDeleted?.(doc.id);
    } catch (error) {
      console.error(error);
      alert(t("docs_delete_failed") || "Failed to delete contract.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!documents.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {t("docs_previous_uploads")}
        </p>
        <p className="mt-3 text-sm text-slate-500">
          {t("docs_empty") || "No previously uploaded contracts yet."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
        {t("docs_previous_uploads")}
      </p>

      <div className="space-y-2">
        {documents.map((doc) => {
          const formattedDate = new Date(doc.created_at).toLocaleDateString(
            dateLocaleForUi(locale),
            {
              day: "numeric",
              month: "short",
              year: "numeric",
            },
          );

          return (
            <div
              key={doc.id}
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <button
                type="button"
                onClick={() => onSelect(doc)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="shrink-0 text-slate-400">
                  <FileText className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {doc.file_name}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{formattedDate}</span>
                    {doc.job_title ? <span>· {doc.job_title}</span> : null}
                  </div>
                </div>

                {typeof doc.compliance_score === "number" ? (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      doc.compliance_score >= 80
                        ? "bg-emerald-100 text-emerald-700"
                        : doc.compliance_score >= 60
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {doc.compliance_score}%
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={(e) => void handleDelete(e, doc)}
                disabled={deletingId === doc.id}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t("docs_delete") || "Delete contract"}
                title={t("docs_delete") || "Delete contract"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}