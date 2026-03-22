import LlamaCloud, { toFile } from "@llamaindex/llama-cloud";

export interface PdfPageItem {
  type: string;
  value: string;
  md?: string;
  b_box?: [number, number, number, number];
  level?: number;
}

export interface PdfPage {
  page_number: number;
  page_width: number;
  page_height: number;
  items: PdfPageItem[];
}

export interface PdfParseResult {
  text: string;
  markdown: string;
  pages: PdfPage[];
  /** LlamaParse presigned screenshot URLs for vision / layout context */
  images: string[];
}

function extractImagesFromResult(result: unknown): string[] {
  const images: string[] = [];
  const imgMetadata =
    result &&
    typeof result === "object" &&
    "images_content_metadata" in result &&
    (result as { images_content_metadata?: unknown }).images_content_metadata != null
      ? (result as { images_content_metadata: { images?: Array<{ presigned_url?: string | null }> } })
          .images_content_metadata
      : undefined;
  if (imgMetadata?.images && Array.isArray(imgMetadata.images)) {
    for (const img of imgMetadata.images) {
      if (typeof img.presigned_url === "string") {
        images.push(img.presigned_url);
      }
    }
  }
  return images;
}

function parsePagesFromItems(rawItems: { pages?: unknown[] } | undefined): PdfPage[] {
  const pages: PdfPage[] = [];
  if (rawItems?.pages && Array.isArray(rawItems.pages)) {
    for (const page of rawItems.pages) {
      const p = page as Record<string, unknown>;
      const pageNum = typeof p.page_number === "number" ? p.page_number : 0;
      const pageW = typeof p.page_width === "number" ? p.page_width : 612;
      const pageH = typeof p.page_height === "number" ? p.page_height : 792;
      const items: PdfPageItem[] = [];

      if (Array.isArray(p.items)) {
        for (const item of p.items) {
          const it = item as Record<string, unknown>;
          items.push({
            type: typeof it.type === "string" ? it.type : "text",
            value: typeof it.value === "string" ? it.value : (typeof it.md === "string" ? it.md : ""),
            md: typeof it.md === "string" ? it.md : undefined,
            b_box: Array.isArray(it.b_box) && it.b_box.length === 4
              ? (it.b_box as [number, number, number, number])
              : undefined,
          });
        }
      }

      pages.push({ page_number: pageNum, page_width: pageW, page_height: pageH, items });
    }
  }
  return pages;
}

/**
 * Extract markdown-first content and structured per-page items from a PDF
 * using LlamaCloud. Markdown is the canonical contract representation for
 * downstream extraction and analysis, while items provide location metadata.
 */
export async function pdfToText(buffer: Buffer): Promise<PdfParseResult> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY ?? process.env.LLAMA_PARSE_API_KEY;
  if (!apiKey) {
    throw new Error("LLAMA_CLOUD_API_KEY or LLAMA_PARSE_API_KEY is not set");
  }

  const client = new LlamaCloud({ apiKey });

  const file = await toFile(buffer, "document.pdf", { type: "application/pdf" });
  const fileObj = await client.files.create({
    file,
    purpose: "parse",
  });

  const result = await client.parsing.parse({
    file_id: fileObj.id,
    tier: "agentic",
    version: "latest",

    input_options: {},

    output_options: {
      markdown: {
        tables: {
          output_tables_as_markdown: false,
        },
      },
      images_to_save: ["screenshot"],
    },

    processing_options: {
      ignore: {
        ignore_diagonal_text: true,
      },
      ocr_parameters: {
        languages: ["en"],
      },
    },

    expand: ["text_full", "markdown_full", "items", "images_content_metadata"],
  });

  const markdown = result.markdown_full ?? "";
  const text = markdown || result.text_full || "";
  if (!text.trim()) {
    throw new Error("LlamaCloud parsing produced no text");
  }

  const pages = parsePagesFromItems(result.items as { pages?: unknown[] } | undefined);
  const images = extractImagesFromResult(result);

  return { text, markdown, pages, images };
}

/**
 * Parse any supported document (PDF or DOCX) via LlamaCloud.
 * The fileName extension tells LlamaCloud which parser to use.
 */
export async function parseDocument(buffer: Buffer, fileName: string): Promise<PdfParseResult> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY ?? process.env.LLAMA_PARSE_API_KEY;
  if (!apiKey) {
    throw new Error("LLAMA_CLOUD_API_KEY or LLAMA_PARSE_API_KEY is not set");
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
  };
  const mimeType = mimeMap[ext] ?? "application/octet-stream";

  const client = new LlamaCloud({ apiKey });
  const file = await toFile(buffer, fileName, { type: mimeType });
  const fileObj = await client.files.create({ file, purpose: "parse" });

  const result = await client.parsing.parse({
    file_id: fileObj.id,
    tier: "agentic",
    version: "latest",
    input_options: {},
    output_options: {
      markdown: { tables: { output_tables_as_markdown: false } },
      images_to_save: ["screenshot"],
    },
    processing_options: {
      ignore: { ignore_diagonal_text: true },
      ocr_parameters: { languages: ["en"] },
    },
    expand: ["text_full", "markdown_full", "items", "images_content_metadata"],
  });

  const markdown = result.markdown_full ?? "";
  const text = markdown || result.text_full || "";
  if (!text.trim()) {
    throw new Error("LlamaCloud parsing produced no text");
  }

  const pages = parsePagesFromItems(result.items as { pages?: unknown[] } | undefined);
  const images = extractImagesFromResult(result);

  return { text, markdown, pages, images };
}
