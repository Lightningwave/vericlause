import { NextRequest, NextResponse } from "next/server";
import { pdfToText } from "@/lib/services/pdf";
import { extractContractEntities } from "@/lib/services/extraction";
import {
  getAuthenticatedUser,
  uploadPdfToStorage,
  insertDocument,
  findDuplicateDocument,
} from "@/lib/services/db";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  const name = (file as File).name ?? "";
  if (!name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ detail: "Only PDF files are accepted" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const existing = await findDuplicateDocument(user.id, name);
  if (existing?.extracted) {
    return NextResponse.json({
      document_id: existing.id,
      raw_text_length: existing.raw_text.length,
      extracted: existing.extracted,
      reused: true,
    });
  }

  let rawText: string;
  let pages: Awaited<ReturnType<typeof pdfToText>>["pages"] = [];
  try {
    const parsed = await pdfToText(buffer);
    rawText = parsed.text;
    pages = parsed.pages;
  } catch (e) {
    return NextResponse.json(
      { detail: `PDF could not be read: ${e instanceof Error ? e.message : e}` },
      { status: 422 },
    );
  }

  if (!rawText.trim()) {
    return NextResponse.json({ detail: "PDF produced no text" }, { status: 422 });
  }

  const [storageResult, extractionResult] = await Promise.allSettled([
    uploadPdfToStorage(user.id, name, buffer),
    extractContractEntities(rawText, pages),
  ]);

  const filePath = storageResult.status === "fulfilled" ? storageResult.value : undefined;
  const extracted = extractionResult.status === "fulfilled" ? extractionResult.value : null;
  const extractionError = extractionResult.status === "rejected"
    ? (extractionResult.reason instanceof Error ? extractionResult.reason.message : "Extraction failed")
    : undefined;

  const doc = await insertDocument(user.id, name, rawText, extracted, filePath);

  return NextResponse.json({
    document_id: doc.id,
    raw_text_length: rawText.length,
    extracted,
    ...(extractionError ? { extraction_error: extractionError } : {}),
  });
}
