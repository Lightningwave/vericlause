export type {
  ExtractedContract,
  ComplianceVerdict,
  ComplianceReport,
  TranslationLanguage,
  ContractComparison,
  BenchmarkResult,
  ResumeProfile,
  ResumeSuggestion,
} from "./types";

/** API returned 401 — redirect to sign-in instead of treating as empty/missing data. */
export class ApiUnauthorizedError extends Error {
  constructor(message = "Session expired or not signed in.") {
    super(message);
    this.name = "ApiUnauthorizedError";
  }
}

export function isApiUnauthorizedError(e: unknown): e is ApiUnauthorizedError {
  return e instanceof ApiUnauthorizedError;
}

export async function uploadPdf(file: File): Promise<{
  document_id: string;
  raw_text_length: number;
  extracted: Record<string, unknown> | null;
  extraction_error?: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/contracts/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Upload failed");
  }
  return res.json();
}

export async function analyzeDocument(body: {
  document_id: string;
  employee_context?: import("./types").EmployeeContext;
}): Promise<{
  job_id: string;
  status: string;
  report?: import("./types").ComplianceReport;
}> {
  const res = await fetch("/api/contracts/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Analysis failed");
  }
  return res.json();
}

export async function getAnalyzeJob(jobId: string): Promise<{
  job: {
    id: string;
    document_id: string;
    status: string;
    error: string | null;
    report_id: string | null;
    progress?: number;
    stage?: string | null;
    created_at: string;
    updated_at: string;
  };
  report: {
    id: string;
    verdicts: import("./types").ComplianceVerdict[];
    compliance_score: number;
    created_at: string;
    document_id: string;
  } | null;
}> {
  const res = await fetch(`/api/contracts/analyze/${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.detail || res.statusText || "Failed to fetch analysis job",
    );
  }
  return res.json();
}

export async function translateVerdicts(
  verdicts: import("./types").ComplianceVerdict[],
  language: import("./types").TranslationLanguage,
): Promise<{
  verdicts: import("./types").ComplianceVerdict[];
  language: import("./types").TranslationLanguage;
}> {
  const res = await fetch("/api/contracts/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verdicts, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Translation failed");
  }
  return res.json();
}

export async function compareContracts(
  documentAId: string,
  documentBId: string,
): Promise<{
  job_id: string;
  status: string;
  result?: import("./types").ContractComparison;
}> {
  const res = await fetch("/api/contracts/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_a_id: documentAId,
      document_b_id: documentBId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Comparison failed");
  }
  return res.json();
}

export async function getComparisonJob(jobId: string): Promise<{
  job: import("./types").ComparisonJobRow;
}> {
  const res = await fetch(`/api/contracts/compare/${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.detail || res.statusText || "Failed to fetch comparison job",
    );
  }
  return res.json();
}

export interface DocumentSummary {
  id: string;
  file_name: string;
  created_at: string;
  extracted: import("./types").ExtractedContract | null;
  latest_score: number | null;
  compliance_score?: number | null;
  job_title?: string | null;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const res = await fetch("/api/contracts");
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents ?? [];
}

export async function getDocumentWithReport(documentId: string): Promise<{
  document: {
    id: string;
    file_name: string;
    created_at: string;
    extracted: import("./types").ExtractedContract | null;
  };
  report: {
    verdicts: import("./types").ComplianceVerdict[];
    compliance_score: number;
    created_at: string;
  } | null;
} | null> {
  const res = await fetch(`/api/contracts/${encodeURIComponent(documentId)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function deleteDocumentById(
  documentId: string,
): Promise<boolean> {
  const res = await fetch(`/api/contracts/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
  });
  return res.ok;
}

/** Backward-compatible export for DocumentList.tsx */
export async function deleteDocument(documentId: string): Promise<boolean> {
  return deleteDocumentById(documentId);
}

export async function benchmarkContract(body: {
  job_title: string;
  salary: number | null;
  annual_leave_days: number | null;
  notice_period_days: number | null;
  probation_months: number | null;
}): Promise<import("./types").BenchmarkResult> {
  const res = await fetch("/api/contracts/benchmark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Benchmark failed");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Resume onboarding
// ---------------------------------------------------------------------------

export interface ResumeStatus {
  has_resume: boolean;
  has_profile: boolean;
  resume_id: string | null;
}

/** Slim check for nav / job gates: any resume row, and whether profiling has run. */
export async function getResumeStatus(): Promise<ResumeStatus | null> {
  const res = await fetch("/api/resumes/status", { cache: "no-store" });
  if (res.status === 401) {
    return { has_resume: false, has_profile: false, resume_id: null };
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Failed to load resume status");
  }
  return res.json() as Promise<ResumeStatus>;
}

/** Response from POST /api/resumes — upload also starts a profiling job (same as /api/resumes/profile). */
export type UploadResumeResponse =
  | {
      resume_id: string;
      raw_text_length: number;
      job_id: string;
      status: "succeeded";
      profile: import("./types").ResumeProfile;
      suggestions: import("./types").ResumeSuggestion[];
    }
  | {
      resume_id: string;
      raw_text_length: number;
      job_id: string;
      status: "running";
    }
  | {
      resume_id: string;
      raw_text_length: number;
      profiling_error: string;
    };

export async function uploadResume(
  file: File,
): Promise<UploadResumeResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/resumes", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Upload failed");
  }
  return res.json();
}

export type ResumeSummary = {
  id: string;
  file_name: string;
  created_at: string;
  parsed_profile: import("./types").ResumeProfile | null;
  ai_suggestions: import("./types").ResumeSuggestion[] | null;
};

export async function listResumes(): Promise<{ resumes: ResumeSummary[] }> {
  const res = await fetch("/api/resumes");
  if (res.status === 401) {
    return { resumes: [] };
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Failed to load resumes");
  }
  return res.json();
}