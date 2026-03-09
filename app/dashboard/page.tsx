"use client";

import { useState, useCallback, useEffect } from "react";
import { DisclaimerModal, useDisclaimerAccepted } from "@/components/DisclaimerModal";
import { OnboardingForm } from "@/components/OnboardingForm";
import { ComplianceScore } from "@/components/ComplianceScore";
import { VerdictBadge } from "@/components/VerdictBadge";
import { SiteNavbar } from "@/components/SiteNavbar";
import { uploadPdf, analyzeDocument, purgeDocument, type ComplianceReport } from "@/lib/api";
import Link from "next/link";

type Step = "onboarding" | "upload" | "analyzing" | "report";

export default function DashboardPage() {
  const [disclaimerAccepted, acceptDisclaimer] = useDisclaimerAccepted();
  const [step, setStep] = useState<Step>("onboarding");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = useCallback(async (f: File) => {
    setFile(f);
    setUploadError(null);
    setStep("analyzing");
    try {
      const res = await uploadPdf(f);
      setDocumentId(res.document_id);
      if (res.extraction_error) {
        setAnalyzeError(res.extraction_error);
        setStep("upload");
        return;
      }
      const body = {
        document_id: res.document_id,
        purge_after: true,
      };
      const analysis = await analyzeDocument(body);
      setReport(analysis);
      setStep("report");
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Analysis failed");
      setStep("upload");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (documentId && step === "report") {
        purgeDocument(documentId).catch(() => {});
      }
    };
  }, [documentId, step]);

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
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Compliance Dashboard
          </div>
        }
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        {step === "onboarding" && (
          <div className="max-w-xl mx-auto">
            <h1 className="font-serif text-2xl font-bold text-navy-950 mb-2">Welcome</h1>
            <p className="text-slate-600 mb-8">Please confirm a few details before we begin.</p>
            <OnboardingForm
              onSubmit={() => {
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
              {analyzeError && <p className="mt-3 text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">{analyzeError}</p>}
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
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="font-serif text-2xl font-bold text-navy-950">Compliance Report</h1>
                <p className="text-slate-600 text-sm mt-1">Generated on {new Date().toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => {
                  setStep("upload");
                  setReport(null);
                  setDocumentId(null);
                }}
                className="text-sm font-medium text-navy-600 hover:text-navy-900 underline-offset-4 hover:underline"
              >
                Upload New
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-[240px_1fr]">
              <div className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center text-center">
                  <h3 className="font-serif text-lg font-bold text-navy-900 mb-4">Compliance Score</h3>
                  <ComplianceScore score={report.compliance_score} />
                  <p className="mt-4 text-xs text-slate-500">Based on statutory minimums.</p>
                </div>
                
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <h4 className="font-bold text-navy-900 text-sm mb-3">Extracted Details</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="block text-xs text-slate-500 uppercase tracking-wider">Salary</span>
                      <span className="font-medium text-slate-800">{report.extracted.salary != null ? `SGD ${report.extracted.salary}` : "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 uppercase tracking-wider">Role</span>
                      <span className="font-medium text-slate-800">{report.extracted.job_title ?? "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 uppercase tracking-wider">Annual Leave</span>
                      <span className="font-medium text-slate-800">{report.extracted.annual_leave_days ?? "—"} days</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-navy-900 border-b border-slate-200 pb-2">Clause Analysis</h3>
                {report.verdicts.map((v, i) => (
                  <VerdictBadge key={i} verdict={v} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
