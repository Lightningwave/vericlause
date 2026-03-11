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
