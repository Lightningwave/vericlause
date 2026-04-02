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

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export interface DocumentSummary {
  id: string;
  file_name: string;
  created_at: string;
  extracted: import("./types").ExtractedContract | null;
  latest_score: number | null;
  compliance_score?: number | null;
  job_title?: string | null;
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

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || res.statusText || "Upload failed",
    );
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

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || res.statusText || "Analysis failed",
    );
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

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Failed to fetch analysis job",
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

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Translation failed",
    );
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

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Comparison failed",
    );
  }

  return res.json();
}

export async function getComparisonJob(jobId: string): Promise<{
  job: import("./types").ComparisonJobRow;
}> {
  const res = await fetch(`/api/contracts/compare/${encodeURIComponent(jobId)}`);

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Failed to fetch comparison job",
    );
  }

  return res.json();
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const res = await fetch("/api/contracts", { cache: "no-store" });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return (data.documents ?? []) as DocumentSummary[];
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
  const res = await fetch(`/api/contracts/${encodeURIComponent(documentId)}`, {
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Failed to load document",
    );
  }

  return res.json();
}

export async function deleteDocumentById(
  documentId: string,
): Promise<boolean> {
  const res = await fetch(`/api/contracts/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
  });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  return res.ok;
}

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

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Benchmark failed",
    );
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------

export interface ResumeStatus {
  has_resume: boolean;
  has_profile: boolean;
  resume_id: string | null;
}

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

export type ResumeSummary = {
  id: string;
  file_name: string;
  created_at: string;
  parsed_profile: import("./types").ResumeProfile | null;
  ai_suggestions: import("./types").ResumeSuggestion[] | null;
};

export async function getResumeStatus(): Promise<ResumeStatus | null> {
  const res = await fetch("/api/resumes/status", { cache: "no-store" });

  if (res.status === 401) {
    return { has_resume: false, has_profile: false, resume_id: null };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Failed to load resume status",
    );
  }

  return res.json() as Promise<ResumeStatus>;
}

export async function uploadResume(
  file: File,
): Promise<UploadResumeResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/resumes", {
    method: "POST",
    body: form,
  });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || res.statusText || "Upload failed",
    );
  }

  return res.json();
}

export async function listResumes(): Promise<{ resumes: ResumeSummary[] }> {
  const res = await fetch("/api/resumes", { cache: "no-store" });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Failed to load resumes",
    );
  }

  return res.json();
}

export async function getResumeById(resumeId: string): Promise<{
  resume: {
    id: string;
    file_name: string;
    raw_text: string;
    parsed_profile: import("./types").ResumeProfile | null;
    ai_suggestions: import("./types").ResumeSuggestion[] | null;
    created_at: string;
  };
} | null> {
  const res = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, {
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Failed to load resume",
    );
  }

  return res.json();
}

export async function deleteResumeById(resumeId: string): Promise<boolean> {
  const res = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, {
    method: "DELETE",
  });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  return res.ok;
}

export async function deleteResume(resumeId: string): Promise<boolean> {
  return deleteResumeById(resumeId);
}

export async function profileResume(resume_id: string): Promise<{
  job_id: string;
  status: string;
  profile?: import("./types").ResumeProfile;
  suggestions?: import("./types").ResumeSuggestion[];
}> {
  const res = await fetch("/api/resumes/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id }),
  });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Profiling failed",
    );
  }

  return res.json();
}

export async function getProfileJob(jobId: string): Promise<{
  job: {
    id: string;
    resume_id: string;
    status: string;
    error: string | null;
  };
  resume: {
    id: string;
    parsed_profile: import("./types").ResumeProfile | null;
    ai_suggestions: import("./types").ResumeSuggestion[] | null;
  } | null;
}> {
  const res = await fetch(`/api/resumes/profile/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        res.statusText ||
        "Failed to fetch profiling job",
    );
  }

  return res.json();
}