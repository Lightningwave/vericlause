export type { ExtractedContract, ComplianceVerdict, ComplianceReport } from "./types";

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
}): Promise<import("./types").ComplianceReport> {
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
