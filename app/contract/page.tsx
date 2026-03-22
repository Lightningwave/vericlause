"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { DisclaimerModal, useDisclaimerAccepted } from "@/components/contract/DisclaimerModal";
import { OnboardingForm, type OnboardingData } from "@/components/contract/OnboardingForm";
import { VerdictBadge } from "@/components/contract/VerdictBadge";
import { ContractViewer } from "@/components/contract/ContractViewer";
import { ClausePanel } from "@/components/contract/ClausePanel";
import { BenchmarkPanel } from "@/components/contract/BenchmarkPanel";
import { DocumentList } from "@/components/contract/DocumentList";
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
import type { Locale } from "@/lib/i18n/types";
import { useLanguage } from "@/components/providers/language-provider";
import { ContractFlowStepper, type ContractFlowStep } from "@/components/contract/contract-flow-stepper";
import { SummaryCard } from "@/components/contract/summary-card";

type WorkspaceState = "idle" | "uploading" | "analyzing" | "ready" | "error";
type ReportTab = "overview" | "risks" | "clauses" | "benchmark";

type TranslateFn = (key: string) => string;

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

function getOverallRisk(verdicts: ComplianceVerdict[], t: TranslateFn) {
  const counts = getSeverityCounts(verdicts);
  if (counts.high > 0) return t("dash_risk_high");
  if (counts.medium > 0) return t("dash_risk_medium");
  return t("dash_risk_low");
}

function formatNoticePeriod(extracted: ExtractedContract, t: TranslateFn) {
  if (extracted.notice_period_days != null) {
    return t("dash_unit_days").replace("{{n}}", String(extracted.notice_period_days));
  }
  if (extracted.notice_period_weeks != null) {
    return t("dash_unit_weeks").replace("{{n}}", String(extracted.notice_period_weeks));
  }
  if (extracted.notice_period_months != null) {
    return t("dash_unit_months").replace("{{n}}", String(extracted.notice_period_months));
  }
  return "—";
}

function buildOverviewSummary(report: ComplianceReport, t: TranslateFn) {
  const counts = getSeverityCounts(report.verdicts);
  const extracted = report.extracted;
  const bits: string[] = [];

  if (report.compliance_score >= 85) {
    bits.push(t("dash_ov_score_good"));
  } else if (report.compliance_score >= 65) {
    bits.push(t("dash_ov_score_ok"));
  } else {
    bits.push(t("dash_ov_score_bad"));
  }

  if (counts.high > 0) {
    bits.push(
      t(counts.high === 1 ? "dash_ov_high_one" : "dash_ov_high_many").replace("{{count}}", String(counts.high)),
    );
  } else if (counts.medium > 0) {
    bits.push(
      t(counts.medium === 1 ? "dash_ov_caution_one" : "dash_ov_caution_many").replace(
        "{{count}}",
        String(counts.medium),
      ),
    );
  } else {
    bits.push(t("dash_ov_no_flags"));
  }

  if (extracted.job_title) {
    bits.push(t("dash_ov_role").replace("{{title}}", extracted.job_title));
  }

  return bits.join(" ");
}

function getTopIssues(verdicts: ComplianceVerdict[]) {
  return verdicts.filter((v) => v.verdict !== "compliant").slice(0, 4);
}

function getPositiveFindings(verdicts: ComplianceVerdict[]) {
  return verdicts.filter((v) => v.verdict === "compliant").slice(0, 3);
}

function verdictLangFromLocale(locale: Locale): TranslationLanguage | "en" {
  if (locale === "zh") return "zh";
  if (locale === "ta") return "ta";
  if (locale === "ms") return "ms";
  return "en";
}

export default function ContractPage() {
  const router = useRouter();
  const { locale, t } = useLanguage();

  const [authChecked, setAuthChecked] = useState(false);
  const [disclaimerAccepted, acceptDisclaimer] = useDisclaimerAccepted();

  const [userDocs, setUserDocs] = useState<DocumentSummary[]>([]);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>("idle");

  const [employeeCtx, setEmployeeCtx] = useState<EmployeeContext>({
    monthly_salary: null,
    work_type: null,
  });
  const [contextSaved, setContextSaved] = useState(false);
  /** Employment contract UX: context → upload → full dashboard (viewer + analysis). */
  const [flowStep, setFlowStep] = useState<ContractFlowStep>("context");

  const [documentId, setDocumentId] = useState<string | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [file, setFile] = useState<File | null>(null);
  /** PDF chosen in step 2 — controls Upload & analyze enabled state and styling */
  const [uploadInputReady, setUploadInputReady] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeJobId, setAnalyzeJobId] = useState<string | null>(null);

  const [activeClause, setActiveClause] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");

  const [translatedVerdicts, setTranslatedVerdicts] = useState<ComplianceVerdict[] | null>(null);
  const [translating, setTranslating] = useState(false);

  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [benchmarking, setBenchmarking] = useState(false);

  const verdictTargetLang = useMemo(() => verdictLangFromLocale(locale), [locale]);

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

  const skipFlowPersist = useRef(true);

  /** Always land on step 1 (context); do not restore upload/workspace from session. */
  useEffect(() => {
    try {
      sessionStorage.removeItem("vericlause.contractFlowStep");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (skipFlowPersist.current) {
      skipFlowPersist.current = false;
      return;
    }
    try {
      sessionStorage.setItem("vericlause.contractFlowStep", flowStep);
    } catch {
      /* ignore */
    }
  }, [flowStep]);

  useEffect(() => {
    if (flowStep === "upload") {
      setUploadInputReady(false);
    }
  }, [flowStep]);

  const activeClauseData = activeClause
    ? report?.extracted.clauses?.find((c) => c.clause_title === activeClause) ?? null
    : null;

  const displayVerdicts = useMemo(
    () =>
      verdictTargetLang !== "en" && translatedVerdicts
        ? translatedVerdicts
        : report?.verdicts ?? [],
    [report, translatedVerdicts, verdictTargetLang],
  );

  const summaryText = useMemo(
    () => (report ? buildOverviewSummary(report, t) : ""),
    [report, t],
  );

  const tabLabels = useMemo(
    () =>
      ({
        overview: t("dash_tab_overview"),
        risks: t("dash_tab_risks"),
        clauses: t("dash_tab_clauses"),
        benchmark: t("dash_tab_benchmark"),
      }) satisfies Record<ReportTab, string>,
    [t],
  );
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
            throw new Error(job.error ?? t("dash_error_analysis_failed"));
          }

          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        throw new Error(t("dash_error_analysis_timeout"));
      } catch (error) {
        setAnalyzeError(
          error instanceof Error ? error.message : t("dash_error_analysis_failed"),
        );
        setWorkspaceState("error");
      }
    },
    [employeeCtx, t],
  );

  const handleUpload = useCallback(
    async (selectedFile: File) => {
      setFlowStep("workspace");
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
        setUploadError(error instanceof Error ? error.message : t("dash_error_upload_failed"));
        setWorkspaceState("error");
      }
    },
    [handleAnalyze, t],
  );

  const handleSelectExisting = useCallback(
    async (doc: DocumentSummary) => {
      setFlowStep("workspace");
      setDocumentId(doc.id);
      setAnalyzeJobId(null);
      setActiveClause(null);
      setTranslatedVerdicts(null);
      // Global `locale` + useEffect re-translate verdicts when `report` loads.
      setBenchmarkResult(null);
      setUploadError(null);
      setAnalyzeError(null);

      const result = await getDocumentWithReport(doc.id);
      if (!result) return;

      try {
        const pdfRes = await fetch(`/api/contracts/${encodeURIComponent(doc.id)}/pdf`);
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

  /**
   * After analysis (new upload, re-analyze, or library pick), `report` updates → re-run translate
   * so non-English site language gets matching verdict text. Compliance analysis stays English in the API;
   * this calls the translate LLM when locale is zh/ta/ms.
   */
  useEffect(() => {
    if (!report?.verdicts?.length) return;
    const target = verdictLangFromLocale(locale);
    void handleTranslate(target);
  }, [locale, report?.document_id, handleTranslate, report?.verdicts?.length]);

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
              try {
                sessionStorage.removeItem("vericlause.contractFlowStep");
              } catch {
                /* ignore */
              }
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/");
              router.refresh();
            }}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-navy-950"
          >
            {t("dash_sign_out")}
          </button>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <ContractFlowStepper step={flowStep} onStepChange={setFlowStep} />

        {flowStep === "context" ? (
          <div className="mx-auto max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              {t("dash_section_badge")}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy-950 sm:text-4xl">
              {t("dash_step1_title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              {t("dash_step1_desc")}
            </p>

            <div className="mt-8">
              <OnboardingForm
                initialSalary={employeeCtx.monthly_salary ?? undefined}
                initialWorkType={employeeCtx.work_type ?? undefined}
                onSubmit={(data: OnboardingData) => {
                  setEmployeeCtx({
                    monthly_salary: data.monthly_basic_salary || null,
                    work_type: data.work_type || null,
                  });
                  setContextSaved(true);
                  setFlowStep("upload");
                }}
              />
            </div>

            <p className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setFlowStep("upload")}
                className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-navy-950"
              >
                {t("dash_step1_skip")}
              </button>
            </p>
          </div>
        ) : null}

        {flowStep === "upload" ? (
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
                {t("dash_section_badge")}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold text-navy-950 sm:text-4xl">
                {t("dash_step2_title")}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                {t("dash_step2_desc")}
              </p>
            </div>

            {contextSaved ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {t("dash_ctx_saved")}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-xl font-semibold text-navy-950">{t("dash_upload_card_title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("dash_upload_card_desc")}
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
                  onChange={(e) => setUploadInputReady(!!e.target.files?.[0])}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-navy-700 hover:file:bg-navy-100"
                />

                <button
                  type="submit"
                  disabled={!uploadInputReady}
                  className={`mt-4 w-full rounded-lg px-4 py-3 text-sm font-medium transition ${
                    uploadInputReady
                      ? "bg-navy-950 text-white hover:bg-navy-900"
                      : "cursor-not-allowed bg-slate-200 text-slate-500"
                  }`}
                >
                  {workspaceState === "uploading" || workspaceState === "analyzing"
                    ? t("dash_upload_processing")
                    : t("dash_upload_analyze")}
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
                      {t("dash_retry_analysis")}
                    </button>
                  ) : null}
                  {analyzeJobId ? (
                    <p className="mt-2 text-[11px] text-amber-900/70">
                      {t("dash_job_id")} <span className="font-mono">{analyzeJobId}</span>
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
          </div>
        ) : null}

        {flowStep === "workspace" ? (
          <>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              {t("dash_section_badge")}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy-950 sm:text-4xl">
              {t("dash_step3_title")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {t("dash_step3_desc")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {report ? (
              <>
                {translating ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-navy-600" />
                    <span>{t("dash_translating")}</span>
                  </div>
                ) : null}

                <button
                  onClick={() => {
                    setReport(null);
                    setDocumentId(null);
                    setFile(null);
                    setActiveClause(null);
                    setTranslatedVerdicts(null);
                    setBenchmarkResult(null);
                    setUploadError(null);
                    setAnalyzeError(null);
                    setWorkspaceState("idle");
                    setFlowStep("upload");
                    listDocuments().then(setUserDocs);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {t("dash_analyze_another")}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={t("dash_card_compliance")}
            value={report ? `${report.compliance_score}` : "—"}
            helper={report ? t("dash_card_compliance_helper") : t("dash_card_empty_helper")}
          />
          <SummaryCard
            label={t("dash_card_risk")}
            value={report ? getOverallRisk(report.verdicts, t) : "—"}
            helper={report ? t("dash_card_risk_helper") : t("dash_card_empty_helper")}
          />
          <SummaryCard
            label={t("dash_card_issues")}
            value={report ? severityCounts.high + severityCounts.medium : "—"}
            helper={report ? t("dash_card_issues_helper") : t("dash_card_empty_helper")}
          />
          <SummaryCard
            label={t("dash_card_clauses")}
            value={report?.extracted.clauses?.length ?? "—"}
            helper={report ? t("dash_card_clauses_helper") : t("dash_card_empty_helper")}
          />
        </div>

        {uploadError || analyzeError ? (
          <div className="mb-6 space-y-3">
            {uploadError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{uploadError}</p>
            ) : null}
            {analyzeError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p>{analyzeError}</p>
                {documentId ? (
                  <button
                    type="button"
                    onClick={() => handleAnalyze(documentId)}
                    className="mt-3 rounded-lg bg-navy-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-navy-900"
                  >
                    {t("dash_retry_analysis")}
                  </button>
                ) : null}
                {analyzeJobId ? (
                  <p className="mt-2 text-[11px] text-amber-900/70">
                    {t("dash_job_id")} <span className="font-mono">{analyzeJobId}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="min-h-[640px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-serif text-xl font-semibold text-navy-950">{t("dash_viewer_title")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t("dash_viewer_desc")}
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
                  {t("dash_no_pdf")}
                </div>
              )}
            </div>
          </section>

          <section className="min-h-[640px] rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-serif text-xl font-semibold text-navy-950">{t("dash_ai_title")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t("dash_ai_desc")}
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
                    {tabLabels[tab]}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[664px] overflow-auto p-5">
              {(workspaceState === "uploading" || workspaceState === "analyzing") && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
                  <h3 className="mt-5 font-serif text-xl font-semibold text-navy-950">
                    {t("dash_ai_reviewing_title")}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    {t("dash_ai_reviewing_desc")}
                  </p>
                </div>
              )}

              {workspaceState !== "uploading" &&
                workspaceState !== "analyzing" &&
                !report && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("dash_waiting_badge")}
                    </div>
                    <h3 className="mt-5 font-serif text-xl font-semibold text-navy-950">
                      {t("dash_waiting_title")}
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                      {t("dash_waiting_desc")}
                    </p>
                  </div>
                )}

              {report && activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("dash_ai_summary")}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{summaryText}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                        {t("dash_attention")}
                      </p>
                      <div className="mt-4 space-y-3">
                        {getTopIssues(displayVerdicts).length > 0 ? (
                          getTopIssues(displayVerdicts).map((issue, index) => (
                            <div key={`${issue.clause_type}-${index}`} className="rounded-xl bg-white p-3">
                              <p className="text-sm font-semibold text-slate-900">{issue.clause_type}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {issue.translated_explanation ||
                                  issue.explanation ||
                                  t("dash_review_clause_fallback")}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-red-800">{t("dash_no_major_issues")}</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        {t("dash_acceptable")}
                      </p>
                      <div className="mt-4 space-y-3">
                        {getPositiveFindings(displayVerdicts).length > 0 ? (
                          getPositiveFindings(displayVerdicts).map((item, index) => (
                            <div key={`${item.clause_type}-${index}`} className="rounded-xl bg-white p-3">
                              <p className="text-sm font-semibold text-slate-900">{item.clause_type}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {item.translated_explanation ||
                                  item.explanation ||
                                  t("dash_no_issue_fallback")}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-emerald-800">
                            {t("dash_positive_empty")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("dash_key_terms")}
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dash_role")}</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {report.extracted.job_title ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dash_salary")}</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {report.extracted.salary != null ? `SGD ${report.extracted.salary}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dash_annual_leave")}</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {report.extracted.annual_leave_days != null
                            ? t("dash_unit_days").replace("{{n}}", String(report.extracted.annual_leave_days))
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dash_notice")}</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {formatNoticePeriod(report.extracted, t)}
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
                        showTranslation={verdictTargetLang !== "en" && !!translatedVerdicts}
                      />
                    ))}

                  {displayVerdicts.filter((v) => v.verdict !== "compliant").length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                      {t("dash_risks_empty")}
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
                      showTranslation={verdictTargetLang !== "en" && !!translatedVerdicts}
                    />
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                      {t("dash_clauses_empty")}
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
                        {t("dash_benchmarking")}
                      </p>
                    </div>
                  ) : benchmarkResult ? (
                    <BenchmarkPanel result={benchmarkResult} />
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                      {t("dash_benchmark_empty")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
          </>
        ) : null}
      </main>
    </div>
  );
}