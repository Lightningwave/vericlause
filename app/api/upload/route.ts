import { NextRequest, NextResponse } from "next/server";
import { pdfToText } from "@/lib/services/pdf";
import { extractContractEntities } from "@/lib/services/extraction";
import { createDocumentId, storeDocument, setExtracted } from "@/lib/services/store";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  const name = (file as File).name ?? "";
  if (!name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ detail: "Only PDF files are accepted" }, { status: 400 });
  }

  let rawText: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rawText = await pdfToText(buffer);
  } catch (e) {
    return NextResponse.json(
      { detail: `PDF could not be read: ${e instanceof Error ? e.message : e}` },
      { status: 422 },
    );
  }

  if (!rawText.trim()) {
    return NextResponse.json({ detail: "PDF produced no text" }, { status: 422 });
  }

  const documentId = createDocumentId();
  storeDocument(documentId, rawText);

  try {
    const extracted = await extractContractEntities(rawText);
    setExtracted(documentId, extracted);
    return NextResponse.json({
      document_id: documentId,
      raw_text_length: rawText.length,
      extracted,
    });
  } catch (e) {
    return NextResponse.json({
      document_id: documentId,
      raw_text_length: rawText.length,
      extracted: null,
      extraction_error: e instanceof Error ? e.message : "Extraction failed",
    });
  }
}
