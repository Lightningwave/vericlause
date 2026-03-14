import { createClient } from "@/lib/supabase/server";
import type { ExtractedContract, ComplianceVerdict } from "@/lib/types";

export interface DocumentRow {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string | null;
  raw_text: string;
  extracted: ExtractedContract | null;
  created_at: string;
}

export interface ReportRow {
  id: string;
  document_id: string;
  user_id: string;
  verdicts: ComplianceVerdict[];
  compliance_score: number;
  created_at: string;
}

export type AnalysisJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface AnalysisJobRow {
  id: string;
  document_id: string;
  user_id: string;
  status: AnalysisJobStatus;
  error: string | null;
  report_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function insertDocument(
  userId: string,
  fileName: string,
  rawText: string,
  extracted: ExtractedContract | null,
  filePath?: string,
): Promise<DocumentRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      file_name: fileName,
      file_path: filePath ?? null,
      raw_text: rawText,
      extracted,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save document: ${error.message}`);
  return data as DocumentRow;
}

export async function getDocument(documentId: string): Promise<DocumentRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (error) return null;
  return data as DocumentRow;
}

export async function updateExtracted(
  documentId: string,
  extracted: ExtractedContract,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("documents")
    .update({ extracted })
    .eq("id", documentId);

  if (error) throw new Error(`Failed to update extracted: ${error.message}`);
}

export async function insertReport(
  documentId: string,
  userId: string,
  verdicts: ComplianceVerdict[],
  complianceScore: number,
): Promise<ReportRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      document_id: documentId,
      user_id: userId,
      verdicts,
      compliance_score: complianceScore,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save report: ${error.message}`);
  return data as ReportRow;
}

export async function createAnalysisJob(
  documentId: string,
  userId: string,
): Promise<AnalysisJobRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("analysis_jobs")
    .insert({
      document_id: documentId,
      user_id: userId,
      status: "queued",
      error: null,
      report_id: null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create analysis job: ${error.message}`);
  return data as AnalysisJobRow;
}

export async function updateAnalysisJob(
  jobId: string,
  userId: string,
  patch: Partial<Pick<AnalysisJobRow, "status" | "error" | "report_id">>,
): Promise<AnalysisJobRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("analysis_jobs")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update analysis job: ${error.message}`);
  return data as AnalysisJobRow;
}

export async function getAnalysisJob(
  jobId: string,
  userId: string,
): Promise<AnalysisJobRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("analysis_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as AnalysisJobRow;
}

export async function getReportsByDocument(documentId: string): Promise<ReportRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ReportRow[];
}

export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = createClient();

  const doc = await getDocument(documentId);
  if (doc?.file_path) {
    await supabase.storage.from("contracts").remove([doc.file_path]);
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}

export async function uploadPdfToStorage(
  userId: string,
  fileName: string,
  fileBuffer: Buffer,
): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/${Date.now()}-${fileName}`;
  const { error } = await supabase.storage
    .from("contracts")
    .upload(path, fileBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) throw new Error(`Failed to upload PDF: ${error.message}`);
  return path;
}

export async function getAuthenticatedUser(): Promise<{ id: string } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id } : null;
}

export interface DocumentSummary {
  id: string;
  file_name: string;
  created_at: string;
  extracted: ExtractedContract | null;
  latest_score: number | null;
}

export async function listDocuments(userId: string): Promise<DocumentSummary[]> {
  const supabase = createClient();
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, file_name, created_at, extracted")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !docs) return [];

  const docIds = docs.map((d: { id: string }) => d.id);
  const { data: reports } = await supabase
    .from("reports")
    .select("document_id, compliance_score")
    .in("document_id", docIds)
    .order("created_at", { ascending: false });

  const scoreMap = new Map<string, number>();
  for (const r of reports ?? []) {
    if (!scoreMap.has(r.document_id)) {
      scoreMap.set(r.document_id, r.compliance_score);
    }
  }

  return docs.map((d: { id: string; file_name: string; created_at: string; extracted: ExtractedContract | null }) => ({
    id: d.id,
    file_name: d.file_name,
    created_at: d.created_at,
    extracted: d.extracted,
    latest_score: scoreMap.get(d.id) ?? null,
  }));
}

export async function findDuplicateDocument(
  userId: string,
  fileName: string,
): Promise<DocumentRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .eq("file_name", fileName)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as DocumentRow;
}
