import LlamaCloud, { toFile } from "@llamaindex/llama-cloud";

/**
 * Extract full text from a PDF using LlamaCloud (LlamaParse).
 * Follows the official quick start: upload file → parse by file_id.
 * Requires LLAMA_CLOUD_API_KEY (or LLAMA_PARSE_API_KEY) in the environment.
 */
export async function pdfToText(buffer: Buffer): Promise<string> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY ?? process.env.LLAMA_PARSE_API_KEY;
  if (!apiKey) {
    throw new Error("LLAMA_CLOUD_API_KEY or LLAMA_PARSE_API_KEY is not set");
  }

  const client = new LlamaCloud({ apiKey });

  // 1. Upload file (official quick start: files.create with purpose 'parse')
  const file = await toFile(buffer, "document.pdf", { type: "application/pdf" });
  const fileObj = await client.files.create({
    file,
    purpose: "parse",
  });

  // 2. Parse the uploaded file by file_id
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

    expand: ["text_full", "markdown_full"],
  });

  const text = result.text_full ?? result.markdown_full ?? "";
  if (!text.trim()) {
    throw new Error("LlamaCloud parsing produced no text");
  }
  return text;
}
