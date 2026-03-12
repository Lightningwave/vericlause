"use client";

import { useState, useCallback, useEffect } from "react";
import { DisclaimerModal, useDisclaimerAccepted } from "@/components/DisclaimerModal";
import { OnboardingForm } from "@/components/OnboardingForm";
import { ComplianceScore } from "@/components/ComplianceScore";
import { VerdictBadge } from "@/components/VerdictBadge";
import { SiteNavbar } from "@/components/SiteNavbar";
import { ContractViewer } from "@/components/ContractViewer";
import { ClausePanel } from "@/components/ClausePanel";
import { uploadPdf, analyzeDocument, type ComplianceReport } from "@/lib/api";
import type { EmployeeContext } from "@/lib/types";
import type { OnboardingData } from "@/components/OnboardingForm";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Step = "onboarding" | "upload" | "analyzing" | "report";

export default function DashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [disclaimerAccepted, acceptDisclaimer] = useDisclaimerAccepted();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/sign-in");
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);
  const [step, setStep] = useState<Step>("onboarding");
  const [employeeCtx, setEmployeeCtx] = useState<EmployeeContext>({ monthly_salary: null, work_type: null });
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [activeClause, setActiveClause] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"clauses" | "verdicts">("clauses");
  const activeClauseData = activeClause
    ? report?.extracted.clauses?.find((c) => c.clause_title === activeClause) ?? null
    : null;

  const handleAnalyze = useCallback(async (docId: string) => {
    setAnalyzeError(null);
    setStep("analyzing");
    try {
      const analysis = await analyzeDocument({
        document_id: docId,
        employee_context: employeeCtx,
      });
      setReport(analysis);
      setStep("report");
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Analysis failed");
      setStep("upload");
    }
  }, [employeeCtx]);

  const handleUpload = useCallback(async (f: File) => {
    setFile(f);
    setUploadError(null);
    setAnalyzeError(null);
    setStep("analyzing");
    try {
      const res = await uploadPdf(f);
      setDocumentId(res.document_id);
      if (res.extraction_error) {
        setAnalyzeError(res.extraction_error);
        setStep("upload");
        return;
      }
      await handleAnalyze(res.document_id);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setStep("upload");
    }
  }, [handleAnalyze]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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
        links={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "Dashboard" },
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

      <main className={`mx-auto px-6 py-12 ${step === "report" ? "max-w-7xl" : "max-w-3xl"}`}>
        {step === "onboarding" && (
          <div className="max-w-xl mx-auto">
            <h1 className="font-serif text-2xl font-bold text-navy-950 mb-2">Welcome</h1>
            <p className="text-slate-600 mb-8">Please confirm a few details before we begin.</p>
            <OnboardingForm
              onSubmit={(data: OnboardingData) => {
                setEmployeeCtx({
                  monthly_salary: data.monthly_basic_salary || null,
                  work_type: data.work_type,
                });
                setStep("upload");
              }}
            />
          </div>
        )}

        {step === "upload" && (
          <div className="max-w-xl mx-auto">
            <h1 className="font-serif text-2xl font-bold text-navy-950 mb-2">Upload Contract</h1>
            <p className="text-slate-600 mb-8">Securely analyze your employment agreement.</p>
            
            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 text-center">
                <div className="mx-auto h-12 w-12 text-navy-300 mb-3">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="font-medium text-navy-900">Upload PDF</h3>
                <p className="text-sm text-slate-500 mt-1">Maximum file size 10MB.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.target as HTMLFormElement).querySelector<HTMLInputElement>('input[type="file"]');
                  const f = input?.files?.[0];
                  if (f) handleUpload(f);
                }}
              >
                <div className="mb-4">
                  <input
                    type="file"
                    accept=".pdf"
                    className="block w-full text-sm text-slate-600 
                      file:mr-4 file:py-2.5 file:px-4 
                      file:rounded-md file:border-0 
                      file:text-sm file:font-semibold 
                      file:bg-navy-50 file:text-navy-700 
                      hover:file:bg-navy-100 cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-navy-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-navy-900 transition-colors"
                >
                  Analyze Document
                </button>
              </form>
              {uploadError && <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{uploadError}</p>}
              {analyzeError && (
                <div className="mt-3 text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-100">
                  <p>{analyzeError}</p>
                  {documentId && (
                    <button
                      onClick={() => handleAnalyze(documentId)}
                      className="mt-2 rounded-md bg-navy-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-900 transition-colors"
                    >
                      Retry Analysis
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setStep("onboarding")}
              className="mt-6 w-full text-sm text-slate-500 hover:text-navy-900"
            >
              Back
            </button>
          </div>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
            <h2 className="mt-6 font-serif text-xl font-bold text-navy-900">Analyzing Contract</h2>
            <p className="mt-2 text-slate-500">Cross-referencing with Singapore Statutes...</p>
          </div>
        )}

        {step === "report" && report && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="font-serif text-2xl font-bold text-navy-950">Compliance Report</h1>
                <p className="text-slate-600 text-sm mt-1">Generated on {new Date().toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setStep("upload");
                    setReport(null);
                    setDocumentId(null);
                    setFile(null);
                    setActiveClause(null);
                  }}
                  className="text-sm font-medium text-navy-600 hover:text-navy-900 underline-offset-4 hover:underline"
                >
                  Upload New
                </button>
              </div>
            </div>

            {/* Score + Key Terms bar */}
            <div className="mb-6 grid gap-4 md:grid-cols-[200px_1fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm flex flex-col items-center text-center">
                <ComplianceScore score={report.compliance_score} />
                <p className="mt-3 text-xs text-slate-500">Compliance Score</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                  <div>
                    <span className="block text-xs text-slate-500 uppercase tracking-wider">Role</span>
                    <span className="font-medium text-slate-800">{report.extracted.job_title ?? "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase tracking-wider">Salary</span>
                    <span className="font-medium text-slate-800">{report.extracted.salary != null ? `SGD ${report.extracted.salary}` : "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase tracking-wider">Annual Leave</span>
                    <span className="font-medium text-slate-800">{report.extracted.annual_leave_days != null ? `${report.extracted.annual_leave_days} days` : "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase tracking-wider">Probation</span>
                    <span className="font-medium text-slate-800">{report.extracted.probation_months != null ? `${report.extracted.probation_months} months` : "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase tracking-wider">Notice</span>
                    <span className="font-medium text-slate-800">
                      {report.extracted.notice_period_days != null ? `${report.extracted.notice_period_days} days`
                        : report.extracted.notice_period_weeks != null ? `${report.extracted.notice_period_weeks} weeks`
                        : report.extracted.notice_period_months != null ? `${report.extracted.notice_period_months} months`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Split view: PDF left, Clauses/Verdicts right */}
            <div className="grid gap-6 lg:grid-cols-2" style={{ height: "calc(100vh - 320px)" }}>
              {/* Left: PDF viewer */}
              <div className="min-h-0 overflow-hidden">
                {file ? (
                  <ContractViewer
                    file={file}
                    highlightText={
                      activeClauseData?.source_anchor_text ??
                      activeClauseData?.clause_text ??
                      null
                    }
                    highlightLocations={
                      activeClauseData?.locations ?? null
                    }
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-400">
                    PDF preview not available
                  </div>
                )}
              </div>

              {/* Right: Toggle between clause view and verdict list */}
              <div className="min-h-0 flex flex-col">
                <div className="mb-3 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    onClick={() => setViewMode("clauses")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === "clauses" ? "bg-white text-navy-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Clause Analysis ({report.extracted.clauses?.length ?? 0})
                  </button>
                  <button
                    onClick={() => setViewMode("verdicts")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === "verdicts" ? "bg-white text-navy-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Detailed Verdicts ({report.verdicts.length})
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  {viewMode === "clauses" && report.extracted.clauses?.length > 0 ? (
                    <ClausePanel
                      clauses={report.extracted.clauses}
                      verdicts={report.verdicts}
                      activeClause={activeClause}
                      onClauseClick={(title) => {
                        setActiveClause(activeClause === title ? null : title);
                      }}
                    />
                  ) : viewMode === "verdicts" ? (
                    <div className="space-y-3">
                      {report.verdicts.map((v, i) => (
                        <VerdictBadge key={i} verdict={v} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 py-8 text-center">No clauses extracted</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
