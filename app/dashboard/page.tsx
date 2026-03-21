"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SiteNavbar } from "@/components/SiteNavbar";
import { DisclaimerModal, useDisclaimerAccepted } from "@/components/DisclaimerModal";
import { OnboardingForm } from "@/components/OnboardingForm";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ContractViewer } from "@/components/ContractViewer";
import { ClausePanel } from "@/components/ClausePanel";
import { BenchmarkPanel } from "@/components/BenchmarkPanel";
import { DocumentList } from "@/components/DocumentList";
import { createClient } from "@/lib/supabase/client";
import {
  uploadPdf,
  analyzeDocument,
  getAnalyzeJob,
  translateVerdicts,
  benchmarkContract,
  listDocuments,
  getDocumentWithReport,
  type ComplianceReport,
  type DocumentSummary,
} from "@/lib/api";
import type {
  EmployeeContext,
  TranslationLanguage,
  ComplianceVerdict,
  BenchmarkResult,
  ExtractedContract,
} from "@/lib/types";
import type { OnboardingData } from "@/components/OnboardingForm";

type WorkspaceState = "idle" | "uploading" | "analyzing" | "ready" | "error";
type ReportTab = "overview" | "risks" | "clauses" | "benchmark";

function getSeverityCounts(verdicts: ComplianceVerdict[]) {
  return verdicts.reduce(
    (acc, verdict) => {
      if (verdict.verdict === "violated") acc.high += 1;
      else if (verdict.verdict === "caution") acc.medium += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

function getOverallRisk(verdicts: ComplianceVerdict[]) {
  const counts = getSeverityCounts(verdicts);
  if (counts.high > 0) return "High";
  if (counts.medium > 0) return "Medium";
  return "Low";
}

function formatNoticePeriod(extracted: ExtractedContract) {
  if (extracted.notice_period_days != null) return `${extracted.notice_period_days} days`;
  if (extracted.notice_period_weeks != null) return `${extracted.notice_period_weeks} weeks`;
  if (extracted.notice_period_months != null) return `${extracted.notice_period_months} months`;
  return "—";
}

function buildOverviewSummary(report: ComplianceReport) {
  const counts = getSeverityCounts(report.verdicts);
  const extracted = report.extracted;
  const bits: string[] = [];

  if (report.compliance_score >= 85) {
    bits.push("This contract appears broadly aligned with expected standards.");
  } else if (report.compliance_score >= 65) {
    bits.push("This contract is generally workable, but some clauses may require closer review.");
  } else {
    bits.push("This contract has multiple areas that should be reviewed carefully before signing.");
  }

  if (counts.high > 0) {
    bits.push(`${counts.high} high-risk issue${counts.high > 1 ? "s" : ""} detected.`);
  } else if (counts.medium > 0) {
    bits.push(`${counts.medium} caution area${counts.medium > 1 ? "s" : ""} detected.`);
  } else {
    bits.push("No major red flags were detected in the current analysis.");
  }

  if (extracted.job_title) {
    bits.push(`The role appears to be structured for ${extracted.job_title}.`);
  }

  return bits.join(" ");
}

function getTopIssues(verdicts: ComplianceVerdict[]) {
  return verdicts.filter((v) => v.verdict !== "compliant").slice(0, 4);
}

function getPositiveFindings(verdicts: ComplianceVerdict[]) {
  return verdicts.filter((v) => v.verdict === "compliant").slice(0, 3);
}

function SummaryCard({
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
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-navy-950">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [disclaimerAccepted, acceptDisclaimer] = useDisclaimerAccepted();

  const [userDocs, setUserDocs] = useState<DocumentSummary[]>([]);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>("idle");

  const [employeeCtx, setEmployeeCtx] = useState<EmployeeContext>({
    monthly_salary: null,
    work_type: null,
  });
  const [contextSaved, setContextSaved] = useState(false);

  const [documentId, setDocumentId] = useState<string | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeJobId, setAnalyzeJobId] = useState<string | null>(null);

  const [activeClause, setActiveClause] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");

  const [translationLang, setTranslationLang] = useState<TranslationLanguage | "en">("en");
  const [translatedVerdicts, setTranslatedVerdicts] = useState<ComplianceVerdict[] | null>(null);
  const [translating, setTranslating] = useState(false);

  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [benchmarking, setBenchmarking] = useState(false);

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

  const activeClauseData = activeClause
    ? report?.extracted.clauses?.find((c) => c.clause_title === activeClause) ?? null
    : null;

  const displayVerdicts = useMemo(
    () => (translationLang !== "en" && translatedVerdicts ? translatedVerdicts : report?.verdicts ?? []),
    [report, translatedVerdicts, translationLang],
  );

  const summaryText = useMemo(() => (report ? buildOverviewSummary(report) : ""), [report]);
  const severityCounts = useMemo(
    () => (report ? getSeverityCounts(report.verdicts) : { high: 0, medium: 0, low: 0 }),
    [report],
  );

  const handleAnalyze = useCallback(
    async (docId: string) => {
      setAnalyzeError(null);
      setWorkspaceState("analyzing");

      try {
        const started = await analyzeDocument({
          document_id: docId,
          employee_context: employeeCtx,
        });

        setAnalyzeJobId(started.job_id);

        if (started.report) {
          setReport(started.report);
          setWorkspaceState("ready");
          setActiveTab("overview");
          return;
        }

        const deadline = Date.now() + 180_000;
        while (Date.now() < deadline) {
          const { job } = await getAnalyzeJob(started.job_id);

          if (job.status === "succeeded") {
            const result = await getDocumentWithReport(docId);

            if (result?.report && result.document.extracted) {
              setReport({
                document_id: docId,
                extracted: result.document.extracted as ExtractedContract,
                verdicts: result.report.verdicts,
                compliance_score: result.report.compliance_score,
              });
              setWorkspaceState("ready");
              setActiveTab("overview");
              return;
            }
            break;
          }

          if (job.status === "failed") {
            throw new Error(job.error ?? "Analysis failed");
          }

          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        throw new Error("Analysis is taking longer than expected. Please retry.");
      } catch (error) {
        setAnalyzeError(error instanceof Error ? error.message : "Analysis failed");
        setWorkspaceState("error");
      }
    },
    [employeeCtx],
  );

  const handleUpload = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setUploadError(null);
      setAnalyzeError(null);
      setReport(null);
      setBenchmarkResult(null);
      setTranslatedVerdicts(null);
      setActiveClause(null);
      setWorkspaceState("uploading");

      try {
        const res = await uploadPdf(selectedFile);
        setDocumentId(res.document_id);
        setAnalyzeJobId(null);
        listDocuments().then(setUserDocs);

        if (res.extraction_error) {
          setAnalyzeError(res.extraction_error);
          setWorkspaceState("error");
          return;
        }

        await handleAnalyze(res.document_id);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed");
        setWorkspaceState("error");
      }
    },
    [handleAnalyze],
  );

  const handleSelectExisting = useCallback(
    async (doc: DocumentSummary) => {
      setDocumentId(doc.id);
      setAnalyzeJobId(null);
      setActiveClause(null);
      setTranslatedVerdicts(null);
      setTranslationLang("en");
      setBenchmarkResult(null);
      setUploadError(null);
      setAnalyzeError(null);

      const result = await getDocumentWithReport(doc.id);
      if (!result) return;

      try {
        const pdfRes = await fetch(`/api/documents/${doc.id}/pdf`);
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const pdfFile = new File([blob], doc.file_name, { type: "application/pdf" });
          setFile(pdfFile);
        } else {
          setFile(null);
        }
      } catch {
        setFile(null);
      }

      if (result.report && result.document.extracted) {
        setReport({
          document_id: doc.id,
          extracted: result.document.extracted as ExtractedContract,
          verdicts: result.report.verdicts,
          compliance_score: result.report.compliance_score,
        });
        setWorkspaceState("ready");
        setActiveTab("overview");
      } else if (result.document.extracted) {
        setReport(null);
        await handleAnalyze(doc.id);
      } else {
        setReport(null);
        setWorkspaceState("idle");
      }
    },
    [handleAnalyze],
  );

  const handleDocDeleted = useCallback((docId: string) => {
    setUserDocs((prev) => prev.filter((d) => d.id !== docId));
  }, []);

  const handleTranslate = useCallback(
    async (lang: TranslationLanguage | "en") => {
      setTranslationLang(lang);

      if (lang === "en" || !report) {
        setTranslatedVerdicts(null);
        return;
      }

      setTranslating(true);
      try {
        const res = await translateVerdicts(report.verdicts, lang);
        setTranslatedVerdicts(res.verdicts);
      } catch {
        setTranslatedVerdicts(null);
      } finally {
        setTranslating(false);
      }
    },
    [report],
  );

  const handleBenchmark = useCallback(async () => {
    if (!report?.extracted || benchmarkResult || benchmarking) return;

    setBenchmarking(true);
    try {
      const ext = report.extracted;
      const noticeDays =
        ext.notice_period_days ??
        (ext.notice_period_weeks != null ? ext.notice_period_weeks * 7 : null) ??
        (ext.notice_period_months != null ? ext.notice_period_months * 30 : null);

      const res = await benchmarkContract({
        job_title: ext.job_title ?? "General",
        salary: ext.salary,
        annual_leave_days: ext.annual_leave_days,
        notice_period_days: noticeDays,
        probation_months: ext.probation_months,
      });

      setBenchmarkResult(res);
    } catch {
      setBenchmarkResult(null);
    } finally {
      setBenchmarking(false);
    }
  }, [report, benchmarkResult, benchmarking]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
      </div>
    );
  }

  if (!disclaimerAccepted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DisclaimerModal accepted={false} onAccept={acceptDisclaimer} />
      </div>
    );
  }

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
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              Contract Analysis
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy-950 sm:text-4xl">
              Review your contract with AI insights
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Upload or select an existing contract, then review AI-generated findings, risk areas,
              clause analysis, and market benchmarks without leaving this page. If needed, you can
              also add optional context to improve the accuracy of the review.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {report ? (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Language
                  </label>
                  <select
                    value={translationLang}
                    onChange={(e) => handleTranslate(e.target.value as TranslationLanguage | "en")}
                    disabled={translating}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <option value="en">English</option>
                    <option value="zh">中文 (Chinese)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                  </select>
                  {translating ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-navy-600" />
                  ) : null}
                </div>

                <button
                  onClick={() => {
                    setReport(null);
                    setDocumentId(null);
                    setFile(null);
                    setActiveClause(null);
                    setTranslatedVerdicts(null);
                    setTranslationLang("en");
                    setBenchmarkResult(null);
                    setUploadError(null);
                    setAnalyzeError(null);
                    setWorkspaceState("idle");
                    listDocuments().then(setUserDocs);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Analyze Another Contract
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Compliance Score"
            value={report ? `${report.compliance_score}` : "—"}
            helper={report ? "Overall AI assessment" : "Available after analysis"}
          />
          <SummaryCard
            label="Overall Risk"
            value={report ? getOverallRisk(report.verdicts) : "—"}
            helper={report ? "Based on current verdict severity" : "Available after analysis"}
          />
          <SummaryCard
            label="Issues to Review"
            value={report ? severityCounts.high + severityCounts.medium : "—"}
            helper={report ? "High + caution findings" : "Available after analysis"}
          />
          <SummaryCard
            label="Clauses Detected"
            value={report?.extracted.clauses?.length ?? "—"}
            helper={report ? "Structured clauses extracted" : "Available after analysis"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_420px]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-xl font-semibold text-navy-950">
                Optional context for better analysis
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We can usually extract salary and role details from the contract itself. Add anything
                missing here if you want more accurate AI analysis and benchmarking.
              </p>

              <div className="mt-5">
                <OnboardingForm
                  onSubmit={(data: OnboardingData) => {
                    setEmployeeCtx({
                      monthly_salary: data.monthly_basic_salary || null,
                      work_type: data.work_type || null,
                    });
                    setContextSaved(true);
                  }}
                />
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-600">
                  Leave this blank if the contract already includes the salary or employment details
                  clearly.
                </p>
              </div>

              {contextSaved ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Context saved
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-900">
                    Any details entered here will be included as additional context during AI analysis.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-xl font-semibold text-navy-950">Upload or select contract</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start with a new PDF or pick an existing contract from your document library. The AI
                will first extract details from the contract itself, then use any optional context you
                added above.
              </p>

              <form
                className="mt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>(
                    'input[type="file"]',
                  );
                  const selectedFile = input?.files?.[0];
                  if (selectedFile) handleUpload(selectedFile);
                }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-navy-700 hover:file:bg-navy-100"
                />

                <button
                  type="submit"
                  className="mt-4 w-full rounded-lg bg-navy-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-navy-900"
                >
                  {workspaceState === "uploading" || workspaceState === "analyzing"
                    ? "Processing contract..."
                    : "Analyze contract"}
                </button>
              </form>

              {uploadError ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {uploadError}
                </p>
              ) : null}

              {analyzeError ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p>{analyzeError}</p>
                  {documentId ? (
                    <button
                      onClick={() => handleAnalyze(documentId)}
                      className="mt-3 rounded-lg bg-navy-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-navy-900"
                    >
                      Retry analysis
                    </button>
                  ) : null}
                  {analyzeJobId ? (
                    <p className="mt-2 text-[11px] text-amber-900/70">
                      Job ID: <span className="font-mono">{analyzeJobId}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <DocumentList
              documents={userDocs}
              onSelect={handleSelectExisting}
              onDeleted={handleDocDeleted}
            />
          </section>

          <section className="min-h-[640px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-serif text-xl font-semibold text-navy-950">Contract viewer</h2>
              <p className="mt-1 text-sm text-slate-600">
                Review the original contract while browsing AI-generated findings.
              </p>
            </div>

            <div className="h-[720px]">
              {file ? (
                <ContractViewer
                  file={file}
                  highlightText={activeClauseData?.source_anchor_text ?? activeClauseData?.clause_text ?? null}
                  highlightLocations={activeClauseData?.locations ?? null}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-8 text-center text-sm text-slate-400">
                  Upload or select a contract to preview it here.
                </div>
              )}
            </div>
          </section>

          <section className="min-h-[640px] rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-serif text-xl font-semibold text-navy-950">AI analysis output</h2>
              <p className="mt-1 text-sm text-slate-600">
                Start with the summary, then drill into risks, clauses, and benchmarks.
              </p>
            </div>

            <div className="border-b border-slate-200 p-2">
              <div className="grid grid-cols-4 gap-2">
                {(["overview", "risks", "clauses", "benchmark"] as ReportTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      if (tab === "benchmark") handleBenchmark();
                    }}
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

            <div className="h-[664px] overflow-auto p-5">
              {(workspaceState === "uploading" || workspaceState === "analyzing") && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
                  <h3 className="mt-5 font-serif text-xl font-semibold text-navy-950">
                    AI is reviewing the contract
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    We are extracting clauses, checking compliance, and preparing the analysis for this page.
                  </p>
                </div>
              )}

              {workspaceState !== "uploading" &&
                workspaceState !== "analyzing" &&
                !report && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Waiting for analysis
                    </div>
                    <h3 className="mt-5 font-serif text-xl font-semibold text-navy-950">
                      Your AI results will appear here
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                      Once a contract is uploaded or selected, you’ll see a summary, risk findings,
                      detailed clause analysis, and benchmarks in this panel.
                    </p>
                  </div>
                )}

              {report && activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      AI Summary
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{summaryText}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                        What needs attention
                      </p>
                      <div className="mt-4 space-y-3">
                        {getTopIssues(displayVerdicts).length > 0 ? (
                          getTopIssues(displayVerdicts).map((issue, index) => (
                            <div key={`${issue.clause_type}-${index}`} className="rounded-xl bg-white p-3">
                              <p className="text-sm font-semibold text-slate-900">{issue.clause_type}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {issue.translated_explanation ||
                                  issue.explanation ||
                                  "Review this clause carefully."}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-red-800">No major issues surfaced in the current analysis.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        What looks acceptable
                      </p>
                      <div className="mt-4 space-y-3">
                        {getPositiveFindings(displayVerdicts).length > 0 ? (
                          getPositiveFindings(displayVerdicts).map((item, index) => (
                            <div key={`${item.clause_type}-${index}`} className="rounded-xl bg-white p-3">
                              <p className="text-sm font-semibold text-slate-900">{item.clause_type}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {item.translated_explanation ||
                                  item.explanation ||
                                  "No significant issue detected."}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-emerald-800">
                            Positive findings will appear here when compliant clauses are identified.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Key extracted terms
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Role</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {report.extracted.job_title ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Salary</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {report.extracted.salary != null ? `SGD ${report.extracted.salary}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Annual Leave</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {report.extracted.annual_leave_days != null
                            ? `${report.extracted.annual_leave_days} days`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Notice Period</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {formatNoticePeriod(report.extracted)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {report && activeTab === "risks" && (
                <div className="space-y-3">
                  {displayVerdicts
                    .filter((v) => v.verdict !== "compliant")
                    .map((verdict, index) => (
                      <VerdictBadge
                        key={`${verdict.clause_type}-${index}`}
                        verdict={verdict}
                        showTranslation={translationLang !== "en" && !!translatedVerdicts}
                      />
                    ))}

                  {displayVerdicts.filter((v) => v.verdict !== "compliant").length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                      No high-risk or caution findings are currently present in this report.
                    </div>
                  ) : null}
                </div>
              )}

              {report && activeTab === "clauses" && (
                <div>
                  {report.extracted.clauses?.length > 0 ? (
                    <ClausePanel
                      clauses={report.extracted.clauses}
                      verdicts={displayVerdicts}
                      activeClause={activeClause}
                      onClauseClick={(title) => setActiveClause(activeClause === title ? null : title)}
                      showTranslation={translationLang !== "en" && !!translatedVerdicts}
                    />
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                      No extracted clauses are available for this document yet.
                    </div>
                  )}
                </div>
              )}

              {report && activeTab === "benchmark" && (
                <div>
                  {benchmarking ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-navy-600" />
                      <p className="mt-4 text-sm text-slate-500">
                        Benchmarking this contract against market context...
                      </p>
                    </div>
                  ) : benchmarkResult ? (
                    <BenchmarkPanel result={benchmarkResult} />
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                      Benchmark data will appear here once generated.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}