/**
 * Ingest Docling-parsed law markdown files into Pinecone using OpenAI embeddings.
 *
 * Usage:
 *   npx tsx scripts/ingest-laws.ts
 *
 * Requires .env or .env.local with OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX.
 * Run `python scripts/docling_parse_laws.py` first to produce data/laws-parsed/*.md.
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const PARSED_DIR = path.resolve(process.cwd(), "data", "laws-parsed");
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const EMBED_MODEL = "text-embedding-3-small";
const EMBED_BATCH_SIZE = 100;
const INDEX_NAME = process.env.PINECONE_INDEX || "vericlause-laws";
const NAMESPACE = "employment_act";

function chunkText(text: string, size: number, overlap: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    chunks.push(normalized.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(full));
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

async function embedBatch(
  openai: OpenAI,
  texts: string[],
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: texts,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

async function main() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const pineconeKey = process.env.PINECONE_API_KEY;
  if (!openaiKey) {
    console.error("Set OPENAI_API_KEY in .env or .env.local");
    return;
  }
  if (!pineconeKey) {
    console.error("Set PINECONE_API_KEY in .env or .env.local");
    return;
  }

  const mdFiles = collectMarkdownFiles(PARSED_DIR);
  if (mdFiles.length === 0) {
    console.error(
      `No markdown files found under ${PARSED_DIR}.\n` +
        `Run \`python scripts/docling_parse_laws.py\` first to parse law PDFs with Docling.`,
    );
    return;
  }

  console.log(`Found ${mdFiles.length} Docling markdown file(s). Chunking...`);

  const allChunks: { text: string; actName: string; chunkIndex: number }[] = [];
  for (const filePath of mdFiles) {
    const text = fs.readFileSync(filePath, "utf8");
    const actName = path.parse(filePath).name;
    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
    chunks.forEach((t, i) => allChunks.push({ text: t, actName, chunkIndex: i }));
    console.log(`  ${path.relative(PARSED_DIR, filePath)}: ${chunks.length} chunks`);
  }

  console.log(`Total: ${allChunks.length} chunks. Embedding with OpenAI ${EMBED_MODEL}...`);

  const openai = new OpenAI({ apiKey: openaiKey });
  const texts = allChunks.map((c) => c.text);

  const allVectors: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const vecs = await embedBatch(openai, batch);
    allVectors.push(...vecs);
    console.log(
      `  Embedded ${Math.min(i + EMBED_BATCH_SIZE, texts.length)} / ${texts.length}`,
    );
  }

  console.log("Upserting to Pinecone...");
  const pc = new Pinecone({ apiKey: pineconeKey });
  const index = pc.index(INDEX_NAME);

  const upsertBatch = 100;
  for (let i = 0; i < allChunks.length; i += upsertBatch) {
    const batch = allChunks.slice(i, i + upsertBatch);
    const records = batch.map((c, j) => ({
      id: `${c.actName}_${i + j}`,
      values: allVectors[i + j],
      metadata: {
        text: c.text,
        act_name: c.actName,
        chunk_index: c.chunkIndex,
      },
    }));

    await index.upsert({ records, namespace: NAMESPACE });
    console.log(
      `  Upserted ${Math.min(i + upsertBatch, allChunks.length)} / ${allChunks.length}`,
    );
  }

  console.log("Ingest complete.");
}

main().catch(console.error);
