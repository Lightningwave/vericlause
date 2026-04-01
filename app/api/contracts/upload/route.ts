import { NextRequest, NextResponse } from "next/server";
import { pdfToText } from "@/lib/services/pdf";
import { extractContractEntities } from "@/lib/services/extraction";
import {
  getAuthenticatedUser,
  uploadPdfToStorage,
  insertDocument,
  findDuplicateDocument,
} from "@/lib/services/db";
import { assertUploadSize, maxUploadBytes } from "@/lib/api/limits";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  if (!allowRateLimit(user.id, "upload")) {
    return rateLimitedResponse(120);
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  const maxBytes = maxUploadBytes();
  const tooLarge = assertUploadSize(file, maxBytes);
  if (tooLarge) {
    return tooLarge;
  }

  const name = (file as File).name ?? "";
  if (!name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { detail: "Only PDF files are accepted" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  let pages: Awaited<ReturnType<typeof pdfToText>>["pages"] = [];

  try {
    const parsed = await pdfToText(buffer);
    rawText = parsed.text;
    pages = parsed.pages;
  } catch (e) {
    return NextResponse.json(
      {
        detail: `PDF could not be read: ${
          e instanceof Error ? e.message : String(e)
        }`,
      },
      { status: 422 },
    );
  }

  if (!rawText.trim()) {
    return NextResponse.json(
      { detail: "PDF produced no text" },
      { status: 422 },
    );
  }

  const existing = await findDuplicateDocument(user.id, name);

  if (existing?.file_path) {
    return NextResponse.json({
      document_id: existing.id,
      raw_text_length: existing.raw_text.length,
      extracted: existing.extracted,
      reused: true,
    });
  }

  let filePath: string;
  try {
    filePath = await uploadPdfToStorage(user.id, name, buffer);
  } catch (e) {
    return NextResponse.json(
      {
        detail: `Failed to store PDF: ${
          e instanceof Error ? e.message : String(e)
        }`,
      },
      { status: 500 },
    );
  }

  let extracted = null;
  let extractionError: string | undefined;

  try {
    extracted = await extractContractEntities(rawText, pages);
  } catch (e) {
    extractionError =
      e instanceof Error ? e.message : "Extraction failed";
  }

  try {
    const doc = await insertDocument(user.id, name, rawText, extracted, filePath);

    return NextResponse.json({
      document_id: doc.id,
      raw_text_length: rawText.length,
      extracted,
      ...(extractionError ? { extraction_error: extractionError } : {}),
    });
  } catch (e) {
    return NextResponse.json(
      {
        detail: `Failed to save document record: ${
          e instanceof Error ? e.message : String(e)
        }`,
      },
      { status: 500 },
    );
  }
}