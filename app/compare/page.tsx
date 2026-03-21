"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SiteNavbar } from "@/components/SiteNavbar";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ClauseDiff } from "@/components/ClauseDiff";
import { createClient } from "@/lib/supabase/client";
import { uploadPdf, compareContracts, listDocuments, type DocumentSummary } from "@/lib/api";
import type { ContractComparison } from "@/lib/types";

type SlotState = {
  documentId: string | null;
  fileName: string | null;
  uploading: boolean;
  error: string | null;
  mode: "pick" | "chosen";
};

type CompareState = "idle" | "comparing" | "ready" | "error";
type CompareTab = "summary" | "terms" | "clauses";

const EMPTY_SLOT: SlotState = {
  documentId: null,
  fileName: null,
  uploading: false,
  error: null,
  mode: "pick",
};

function getAssessmentCounts(comparison: ContractComparison) {
  return comparison.key_terms.reduce(
    (acc, item) => {
      if (item.assessment === "a_better") acc.a += 1;
      else if (item.assessment === "b_better") acc.b += 1;
      else if (item.assessment === "different") acc.diff += 1;
      else acc.equal += 1;
      return acc;
    },
    { a: 0, b: 0, diff: 0, equal: 0 },
  );
}

function getPreferredLabel(
  comparison: ContractComparison,
  labelA: string,
  labelB: string,
) {
  const counts = getAssessmentCounts(comparison);
  if (counts.a > counts.b) return labelA;
  if (counts.b > counts.a) return labelB;
  return "Depends on priorities";
}

function topDifferences(comparison: ContractComparison) {
  const clauseDiffs = comparison.clauses.filter((item) => item.assessment !== "equal");
  if (clauseDiffs.length > 0) return clauseDiffs.slice(0, 3);
  return comparison.clauses.slice(0, 3);
}

function cautionItems(comparison: ContractComparison) {
  return comparison.clauses
    .filter((item) => item.assessment === "different")
    .slice(0, 3);
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-navy-950">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function ComparePage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [userDocs, setUserDocs] = useState<DocumentSummary[]>([]);

  const [slotA, setSlotA] = useState<SlotState>(EMPTY_SLOT);
  const [slotB, setSlotB] = useState<SlotState>(EMPTY_SLOT);

  const [compareState, setCompareState] = useState<CompareState>("idle");
  const [comparison, setComparison] = useState<ContractComparison | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CompareTab>("summary");

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

  const labelA = slotA.fileName ?? "Contract A";
  const labelB = slotB.fileName ?? "Contract B";

  const assessmentCounts = useMemo(
    () => (comparison ? getAssessmentCounts(comparison) : { a: 0, b: 0, diff: 0, equal: 0 }),
    [comparison],
  );

  const preferredContract = useMemo(
    () => (comparison ? getPreferredLabel(comparison, labelA, labelB) : "—"),
    [comparison, labelA, labelB],
  );

  const handlePickExisting = useCallback(
    (doc: DocumentSummary, setter: (value: SlotState) => void) => {
      setter({
        documentId: doc.id,
        fileName: doc.file_name,
        uploading: false,
        error: null,
        mode: "chosen",
      });
      setComparison(null);
      setCompareState("idle");
      setCompareError(null);
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
        setComparison(null);
        setCompareState("idle");
        setCompareError(null);
      } catch (error) {
        setter((prev) => ({
          ...prev,
          uploading: false,
          error: error instanceof Error ? error.message : "Upload failed",
        }));
      }
    },
    [],
  );

  const handleCompare = useCallback(async () => {
    if (!slotA.documentId || !slotB.documentId) return;

    setCompareError(null);
    setCompareState("comparing");

    try {
      const result = await compareContracts(slotA.documentId, slotB.documentId);
      setComparison(result);
      setCompareState("ready");
      setActiveTab("summary");
    } catch (error) {
      setCompareError(error instanceof Error ? error.message : "Comparison failed");
      setCompareState("error");
    }
  }, [slotA.documentId, slotB.documentId]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
      </div>
    );
  }

  const otherSlotDocId = (slot: "a" | "b") => (slot === "a" ? slotB.documentId : slotA.documentId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <SiteNavbar
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

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            Contract Comparison
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-navy-950 sm:text-4xl">
            Compare two contracts with AI on the same page
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Select or upload two contracts, generate an AI comparison, and review the summary,
            key terms, and clause differences without leaving this workspace.
          </p>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <ContractSlot
            label="Contract A"
            state={slotA}
            documents={userDocs}
            excludeDocId={otherSlotDocId("a")}
            onPickExisting={(doc) => handlePickExisting(doc, setSlotA)}
            onUploadNew={(file) => handleUploadNew(file, setSlotA)}
            onClear={() => {
              setSlotA(EMPTY_SLOT);
              setComparison(null);
              setCompareError(null);
              setCompareState("idle");
            }}
          />

          <ContractSlot
            label="Contract B"
            state={slotB}
            documents={userDocs}
            excludeDocId={otherSlotDocId("b")}
            onPickExisting={(doc) => handlePickExisting(doc, setSlotB)}
            onUploadNew={(file) => handleUploadNew(file, setSlotB)}
            onClear={() => {
              setSlotB(EMPTY_SLOT);
              setComparison(null);
              setCompareError(null);
              setCompareState("idle");
            }}
          />
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                AI comparison action
              </p>
              <h2 className="mt-2 font-serif text-xl font-semibold text-navy-950">
                Generate the comparison when both contracts are ready
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                The AI output will appear directly below on this page.
              </p>
            </div>

            <button
              onClick={handleCompare}
              disabled={!slotA.documentId || !slotB.documentId || compareState === "comparing"}
              className="inline-flex items-center justify-center rounded-lg bg-navy-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {compareState === "comparing" ? "Comparing with AI..." : "Compare contracts"}
            </button>
          </div>

          {compareError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {compareError}
            </p>
          ) : null}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Preferred Contract"
            value={comparison ? preferredContract : "—"}
            helper={comparison ? "Based on term-level advantage" : "Available after comparison"}
          />
          <StatCard
            label="A Better Terms"
            value={comparison ? assessmentCounts.a : "—"}
            helper={comparison ? labelA : "Available after comparison"}
          />
          <StatCard
            label="B Better Terms"
            value={comparison ? assessmentCounts.b : "—"}
            helper={comparison ? labelB : "Available after comparison"}
          />
          <StatCard
            label="Different Clauses"
            value={comparison ? assessmentCounts.diff : "—"}
            helper={comparison ? "Potential negotiation focus" : "Available after comparison"}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-serif text-xl font-semibold text-navy-950">AI comparison output</h2>
            <p className="mt-1 text-sm text-slate-600">
              Start with the summary, then dive into key terms and clause-by-clause detail.
            </p>
          </div>

          <div className="border-b border-slate-200 p-2">
            <div className="grid grid-cols-3 gap-2">
              {(["summary", "terms", "clauses"] as CompareTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-3 py-2 text-xs font-medium capitalize transition ${
                    activeTab === tab
                      ? "bg-navy-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[520px] p-5">
            {compareState === "comparing" && (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
                <h3 className="mt-5 font-serif text-xl font-semibold text-navy-950">
                  AI is comparing the contracts
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  We are reviewing key terms, clause differences, and the overall balance between both contracts.
                </p>
              </div>
            )}

            {compareState !== "comparing" && !comparison && (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Waiting for comparison
                </div>
                <h3 className="mt-5 font-serif text-xl font-semibold text-navy-950">
                  Your AI comparison will appear here
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  Once both contracts are selected, run the comparison to see a recommendation,
                  term-level differences, and clause-by-clause findings on this page.
                </p>
              </div>
            )}

            {comparison && activeTab === "summary" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    AI Summary
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{comparison.summary}</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Most favorable overall
                    </p>
                    <p className="mt-3 text-lg font-semibold text-emerald-900">{preferredContract}</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">
                      This recommendation is based on which side appears to have more favorable or
                      protective terms across the comparison.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      Key caution areas
                    </p>
                    <div className="mt-3 space-y-3">
                      {cautionItems(comparison).length > 0 ? (
                        cautionItems(comparison).map((item, index) => (
                          <div key={`${item.clause_topic}-${index}`} className="rounded-xl bg-white p-3">
                            <p className="text-sm font-semibold text-slate-900">{item.clause_topic}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{item.explanation}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-amber-800">
                          No major caution clusters were highlighted in the current comparison.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Top differences
                  </p>
                  <div className="mt-4 space-y-3">
                    {topDifferences(comparison).map((item, index) => (
                      <div key={`${item.clause_topic}-${index}`} className="rounded-xl border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-900">{item.clause_topic}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {comparison && activeTab === "terms" && (
              <ComparisonTable
                terms={comparison.key_terms}
                labelA={labelA}
                labelB={labelB}
              />
            )}

            {comparison && activeTab === "clauses" && (
              <ClauseDiff
                clauses={comparison.clauses}
                labelA={labelA}
                labelB={labelB}
              />
            )}
          </div>
        </section>
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
  onUploadNew: (file: File) => void;
  onClear: () => void;
}) {
  const [showUpload, setShowUpload] = useState(false);

  if (state.mode === "chosen" && state.documentId) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{label}</p>
        <h3 className="mt-3 font-serif text-lg font-semibold text-emerald-950">Contract selected</h3>
        <p className="mt-2 truncate text-sm text-emerald-900">{state.fileName}</p>

        <button
          onClick={onClear}
          className="mt-4 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100"
        >
          Change selection
        </button>
      </div>
    );
  }

  const available = documents.filter((doc) => doc.extracted && doc.id !== excludeDocId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <h3 className="mt-3 font-serif text-lg font-semibold text-navy-950">Choose a contract</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Pick from saved contracts or upload a new PDF for comparison.
      </p>

      {!showUpload && available.length > 0 && (
        <>
          <div className="mt-5 space-y-2">
            {available.map((doc) => {
              const date = new Date(doc.created_at).toLocaleDateString("en-SG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <button
                  key={doc.id}
                  onClick={() => onPickExisting(doc)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-navy-300 hover:bg-navy-50/50"
                >
                  <span className="truncate text-sm text-slate-700">{doc.file_name}</span>
                  <span className="text-xs text-slate-400">{date}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 text-sm font-medium text-navy-700 transition hover:text-navy-950"
          >
            Or upload a new contract
          </button>
        </>
      )}

      {(showUpload || available.length === 0) && (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <label className="inline-block cursor-pointer">
            <span className="inline-flex rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-navy-900">
              {state.uploading ? "Uploading..." : "Choose PDF"}
            </span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              disabled={state.uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadNew(file);
              }}
            />
          </label>

          {state.error ? (
            <p className="mt-3 text-sm text-red-600">{state.error}</p>
          ) : null}

          {available.length > 0 ? (
            <button
              onClick={() => setShowUpload(false)}
              className="mt-4 block w-full text-sm font-medium text-slate-500 transition hover:text-navy-900"
            >
              Back to saved contracts
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}