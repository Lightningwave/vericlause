export type {
  ExtractedContract,
  ComplianceVerdict,
  ComplianceReport,
  TranslationLanguage,
  ContractComparison,
  BenchmarkResult,
} from "./types";

export async function uploadPdf(file: File): Promise<{
  document_id: string;
  raw_text_length: number;
  extracted: Record<string, unknown> | null;
  extraction_error?: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", {
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
}): Promise<{ job_id: string; status: string; report?: import("./types").ComplianceReport }> {
  const res = await fetch("/api/analyze", {
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
  const res = await fetch(`/api/analyze/${jobId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Failed to fetch analysis job");
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
  const res = await fetch("/api/translate", {
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
): Promise<import("./types").ContractComparison> {
  const res = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_a_id: documentAId, document_b_id: documentBId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Comparison failed");
  }
  return res.json();
}

export interface DocumentSummary {
  id: string;
  file_name: string;
  created_at: string;
  extracted: import("./types").ExtractedContract | null;
  latest_score: number | null;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const res = await fetch("/api/documents");
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
  const res = await fetch(`/api/documents/${documentId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function deleteDocumentById(documentId: string): Promise<boolean> {
  const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
  return res.ok;
}

export async function benchmarkContract(body: {
  job_title: string;
  salary: number | null;
  annual_leave_days: number | null;
  notice_period_days: number | null;
  probation_months: number | null;
}): Promise<import("./types").BenchmarkResult> {
  const res = await fetch("/api/benchmark", {
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
