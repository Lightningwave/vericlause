"use client";

import { useState } from "react";
import type { DocumentSummary } from "@/lib/api";
import { deleteDocumentById } from "@/lib/api";

interface DocumentListProps {
  documents: DocumentSummary[];
  onSelect: (doc: DocumentSummary) => void;
  onDeleted: (docId: string) => void;
}

export function DocumentList({ documents, onSelect, onDeleted }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this document and all its reports?")) return;
    setDeletingId(docId);
    const ok = await deleteDocumentById(docId);
    if (ok) onDeleted(docId);
    setDeletingId(null);
  };

  if (documents.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="font-serif text-sm font-bold text-navy-900 uppercase tracking-wider mb-3">
        Previous Uploads
      </h3>
      <div className="space-y-2">
        {documents.map((doc) => {
          const jobTitle = doc.extracted?.job_title;
          const date = new Date(doc.created_at).toLocaleDateString("en-SG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const isDeleting = deletingId === doc.id;

          return (
            <button
              key={doc.id}
              onClick={() => onSelect(doc)}
              disabled={isDeleting}
              className="w-full text-left rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-navy-300 hover:shadow-md disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-navy-50 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-navy-600" aria-hidden="true">
                      <path d="M8 3.75h6.586a1 1 0 0 1 .707.293l3.664 3.664a1 1 0 0 1 .293.707V19.25A1.75 1.75 0 0 1 17.5 21h-9A1.75 1.75 0 0 1 6.75 19.25v-13.75A1.75 1.75 0 0 1 8.5 3.75Z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M14.75 3.75v4.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-950 truncate">{doc.file_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {date}
                      {jobTitle && <span> &middot; {jobTitle}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.latest_score != null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.latest_score >= 80
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : doc.latest_score >= 50
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                      }`}
                    >
                      {doc.latest_score}%
                    </span>
                  )}
                  {!doc.latest_score && doc.extracted && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      Not analyzed
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, doc.id)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                    title="Delete document"
                  >
                    {isDeleting ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border border-slate-300 border-t-slate-500" />
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
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
