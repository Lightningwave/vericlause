import { createClient } from "@/lib/supabase/server";
import type { ExtractedContract, ComplianceVerdict, ResumeProfile, ResumeSuggestion } from "@/lib/types";

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

export interface ResumeRow {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string | null;
  raw_text: string;
  image_urls?: string[] | null;
  parsed_profile: ResumeProfile | null;
  ai_suggestions: ResumeSuggestion[] | null;
  created_at: string;
}

export type ProfilingJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface ProfilingJobRow {
  id: string;
  resume_id: string;
  user_id: string;
  status: ProfilingJobStatus;
  error: string | null;
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

// ---------------------------------------------------------------------------
// Resume onboarding
// ---------------------------------------------------------------------------

export async function insertResume(
  userId: string,
  fileName: string,
  rawText: string,
  profile: ResumeProfile | null,
  filePath?: string,
  imageUrls?: string[],
): Promise<ResumeRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      file_name: fileName,
      file_path: filePath ?? null,
      raw_text: rawText,
      parsed_profile: profile,
      image_urls: imageUrls?.length ? imageUrls : null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save resume: ${error.message}`);
  return data as ResumeRow;
}

export async function listResumes(userId: string): Promise<ResumeRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as ResumeRow[];
}

/** Lightweight flags for gating UI (jobs, onboarding) without loading full resume rows. */
export interface ResumeStatusSummary {
  has_resume: boolean;
  has_profile: boolean;
  /** Prefer latest resume that has parsed_profile; otherwise latest upload id. */
  resume_id: string | null;
}

export async function getResumeStatusForUser(userId: string): Promise<ResumeStatusSummary> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, parsed_profile")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data?.length) {
    return { has_resume: false, has_profile: false, resume_id: null };
  }

  const withProfile = data.find((r) => r.parsed_profile != null);
  const has_profile = !!withProfile;
  const resume_id = (withProfile ?? data[0]).id as string;
  return {
    has_resume: true,
    has_profile,
    resume_id,
  };
}

export async function getResume(resumeId: string, userId: string): Promise<ResumeRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as ResumeRow;
}

export async function deleteResume(resumeId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const resume = await getResume(resumeId, userId);
  if (!resume) {
    throw new Error("Resume not found");
  }
  if (resume.file_path) {
    const { error: storageErr } = await supabase.storage.from("resumes").remove([resume.file_path]);
    if (storageErr) {
      console.warn("Failed to remove resume file from storage", storageErr);
    }
  }
  const { error } = await supabase.from("resumes").delete().eq("id", resumeId).eq("user_id", userId);
  if (error) throw new Error(`Failed to delete resume: ${error.message}`);
}

export async function updateResumeProfile(
  resumeId: string,
  userId: string,
  profile: ResumeProfile,
  suggestions: ResumeSuggestion[] = [],
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("resumes")
    .update({
      parsed_profile: profile,
      ai_suggestions: suggestions.length > 0 ? suggestions : null,
    })
    .eq("id", resumeId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to update resume profile: ${error.message}`);
}

export async function createProfilingJob(resumeId: string, userId: string): Promise<ProfilingJobRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiling_jobs")
    .insert({
      resume_id: resumeId,
      user_id: userId,
      status: "queued",
      error: null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create profiling job: ${error.message}`);
  return data as ProfilingJobRow;
}

export async function updateProfilingJob(
  jobId: string,
  userId: string,
  patch: Partial<Pick<ProfilingJobRow, "status" | "error">>,
): Promise<ProfilingJobRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiling_jobs")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update profiling job: ${error.message}`);
  return data as ProfilingJobRow;
}

export async function getProfilingJob(jobId: string, userId: string): Promise<ProfilingJobRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiling_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as ProfilingJobRow;
}
