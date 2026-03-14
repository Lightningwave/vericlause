"use client";

import { useState, useCallback, useEffect } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ClauseDiff } from "@/components/ClauseDiff";
import { uploadPdf, compareContracts, listDocuments, type DocumentSummary } from "@/lib/api";
import type { ContractComparison } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type SlotState = {
  documentId: string | null;
  fileName: string | null;
  uploading: boolean;
  error: string | null;
  mode: "pick" | "chosen";
};

const EMPTY_SLOT: SlotState = {
  documentId: null,
  fileName: null,
  uploading: false,
  error: null,
  mode: "pick",
};

export default function ComparePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userDocs, setUserDocs] = useState<DocumentSummary[]>([]);
  const [slotA, setSlotA] = useState<SlotState>(EMPTY_SLOT);
  const [slotB, setSlotB] = useState<SlotState>(EMPTY_SLOT);
  const [comparison, setComparison] = useState<ContractComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/sign-in");
      } else {
        setAuthChecked(true);
        listDocuments().then(setUserDocs);
      }
    });
  }, [router]);

  const handlePickExisting = useCallback(
    (doc: DocumentSummary, setter: React.Dispatch<React.SetStateAction<SlotState>>) => {
      setter({
        documentId: doc.id,
        fileName: doc.file_name,
        uploading: false,
        error: null,
        mode: "chosen",
      });
    },
    [],
  );

  const handleUploadNew = useCallback(
    async (file: File, setter: React.Dispatch<React.SetStateAction<SlotState>>) => {
      setter((prev) => ({ ...prev, uploading: true, error: null }));
      try {
        const res = await uploadPdf(file);
        setter({
          documentId: res.document_id,
          fileName: file.name,
          uploading: false,
          error: null,
          mode: "chosen",
        });
        listDocuments().then(setUserDocs);
      } catch (e) {
        setter((prev) => ({
          ...prev,
          uploading: false,
          error: e instanceof Error ? e.message : "Upload failed",
        }));
      }
    },
    [],
  );

  const handleCompare = useCallback(async () => {
    if (!slotA.documentId || !slotB.documentId) return;
    setCompareError(null);
    setComparing(true);
    try {
      const result = await compareContracts(slotA.documentId, slotB.documentId);
      setComparison(result);
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setComparing(false);
    }
  }, [slotA.documentId, slotB.documentId]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
      </div>
    );
  }

  const otherSlotDocId = (slot: "a" | "b") =>
    slot === "a" ? slotB.documentId : slotA.documentId;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <SiteNavbar
        links={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "Dashboard" },
          { href: "/compare", label: "Compare" },
        ]}
        rightSlot={
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/");
              router.refresh();
            }}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-navy-950"
          >
            Sign out
          </button>
        }
      />

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-serif text-2xl font-bold text-navy-950 mb-2">
          Compare Contracts
        </h1>
        <p className="text-slate-600 mb-8">
          Select two contracts from your uploads, or upload new ones to compare them side by side.
        </p>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <ContractSlot
            label="Contract A"
            state={slotA}
            documents={userDocs}
            excludeDocId={otherSlotDocId("a")}
            onPickExisting={(doc) => handlePickExisting(doc, setSlotA)}
            onUploadNew={(f) => handleUploadNew(f, setSlotA)}
            onClear={() => {
              setSlotA(EMPTY_SLOT);
              setComparison(null);
            }}
          />
          <ContractSlot
            label="Contract B"
            state={slotB}
            documents={userDocs}
            excludeDocId={otherSlotDocId("b")}
            onPickExisting={(doc) => handlePickExisting(doc, setSlotB)}
            onUploadNew={(f) => handleUploadNew(f, setSlotB)}
            onClear={() => {
              setSlotB(EMPTY_SLOT);
              setComparison(null);
            }}
          />
        </div>

        {slotA.documentId && slotB.documentId && !comparison && (
          <div className="text-center mb-8">
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="inline-flex items-center gap-2 rounded-md bg-navy-950 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-navy-900 transition-colors disabled:opacity-50"
            >
              {comparing && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {comparing ? "Comparing..." : "Compare Contracts"}
            </button>
            {compareError && (
              <p className="mt-3 text-sm text-red-600">{compareError}</p>
            )}
          </div>
        )}

        {comparison && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-serif text-lg font-bold text-navy-950 mb-2">Summary</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{comparison.summary}</p>
            </div>

            {comparison.key_terms.length > 0 && (
              <div>
                <h2 className="font-serif text-lg font-bold text-navy-950 mb-3">Key Terms Comparison</h2>
                <ComparisonTable
                  terms={comparison.key_terms}
                  labelA={slotA.fileName ?? "Contract A"}
                  labelB={slotB.fileName ?? "Contract B"}
                />
              </div>
            )}

            {comparison.clauses.length > 0 && (
              <div>
                <h2 className="font-serif text-lg font-bold text-navy-950 mb-3">Clause-by-Clause Comparison</h2>
                <ClauseDiff
                  clauses={comparison.clauses}
                  labelA={slotA.fileName ?? "Contract A"}
                  labelB={slotB.fileName ?? "Contract B"}
                />
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => {
                  setSlotA(EMPTY_SLOT);
                  setSlotB(EMPTY_SLOT);
                  setComparison(null);
                  setCompareError(null);
                }}
                className="text-sm font-medium text-navy-600 hover:text-navy-900 underline-offset-4 hover:underline"
              >
                Start New Comparison
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ContractSlot({
  label,
  state,
  documents,
  excludeDocId,
  onPickExisting,
  onUploadNew,
  onClear,
}: {
  label: string;
  state: SlotState;
  documents: DocumentSummary[];
  excludeDocId: string | null;
  onPickExisting: (doc: DocumentSummary) => void;
  onUploadNew: (f: File) => void;
  onClear: () => void;
}) {
  const [showUpload, setShowUpload] = useState(false);

  if (state.mode === "chosen" && state.documentId) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="mx-auto h-9 w-9 text-emerald-600 mb-2">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-serif font-bold text-sm text-navy-900 mb-1">{label}</h3>
        <p className="text-xs text-slate-600 mb-3 truncate">{state.fileName}</p>
        <button
          onClick={onClear}
          className="text-xs font-medium text-slate-500 hover:text-red-600"
        >
          Change
        </button>
      </div>
    );
  }

  const available = documents.filter(
    (d) => d.extracted && d.id !== excludeDocId,
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-serif font-bold text-sm text-navy-900 mb-4">{label}</h3>

      {!showUpload && available.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">
            Select from your uploads
          </p>
          <div className="space-y-1.5 max-h-48 overflow-auto mb-4">
            {available.map((doc) => {
              const date = new Date(doc.created_at).toLocaleDateString("en-SG", {
                day: "numeric",
                month: "short",
              });
              return (
                <button
                  key={doc.id}
                  onClick={() => onPickExisting(doc)}
                  className="w-full text-left rounded-md border border-slate-100 px-3 py-2 text-sm hover:border-navy-300 hover:bg-navy-50/50 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="truncate text-slate-700">{doc.file_name}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{date}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={() => setShowUpload(true)}
              className="text-xs font-medium text-navy-600 hover:text-navy-900"
            >
              Or upload a new contract
            </button>
          </div>
        </>
      )}

      {(showUpload || available.length === 0) && (
        <div className="text-center py-2">
          <div className="mx-auto h-8 w-8 text-slate-300 mb-2">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <label className="cursor-pointer inline-block">
            <span className="rounded-md bg-navy-950 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-navy-900 transition-colors">
              {state.uploading ? "Uploading..." : "Choose PDF"}
            </span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              disabled={state.uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadNew(f);
              }}
            />
          </label>
          {state.error && (
            <p className="mt-2 text-xs text-red-600">{state.error}</p>
          )}
          {available.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowUpload(false)}
                className="text-xs font-medium text-slate-500 hover:text-navy-900"
              >
                Back to saved contracts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
