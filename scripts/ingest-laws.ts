/**
 * Ingest Singapore employment law PDFs into Pinecone.
 *
 * Usage:
 *   npx tsx scripts/ingest-laws.ts
 *
 * Requires .env.local with GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX.
 * Place statute PDFs in the data/ folder.
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import pdfParse from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";

config({ path: path.resolve(process.cwd(), ".env.local") });

const DATA_DIR = path.resolve(process.cwd(), "data");
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
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

async function embedBatch(texts: string[], genAI: GoogleGenerativeAI): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const results: number[][] = [];
  for (const text of texts) {
    const res = await model.embedContent(text);
    results.push(res.embedding.values);
  }
  return results;
}

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const pineconeKey = process.env.PINECONE_API_KEY;
  if (!geminiKey) { console.error("Set GEMINI_API_KEY in .env.local"); return; }
  if (!pineconeKey) { console.error("Set PINECONE_API_KEY in .env.local"); return; }

  const pdfFiles = fs.readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (pdfFiles.length === 0) {
    console.error(`No PDFs found in ${DATA_DIR}. Place Employment Act / Workplace Fairness Act PDFs there.`);
    return;
  }

  console.log(`Found ${pdfFiles.length} PDF(s). Processing...`);

  const allChunks: { text: string; actName: string; chunkIndex: number }[] = [];
  for (const filename of pdfFiles) {
    const buffer = fs.readFileSync(path.join(DATA_DIR, filename));
    const data = await pdfParse(buffer);
    const actName = path.parse(filename).name;
    const chunks = chunkText(data.text, CHUNK_SIZE, CHUNK_OVERLAP);
    chunks.forEach((text, i) => allChunks.push({ text, actName, chunkIndex: i }));
    console.log(`  ${filename}: ${chunks.length} chunks`);
  }

  console.log(`Total: ${allChunks.length} chunks. Embedding...`);

  const genAI = new GoogleGenerativeAI(geminiKey);
  const texts = allChunks.map((c) => c.text);

  // Embed in batches of 20 to avoid rate limits
  const allVectors: number[][] = [];
  const batchSize = 20;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vecs = await embedBatch(batch, genAI);
    allVectors.push(...vecs);
    console.log(`  Embedded ${Math.min(i + batchSize, texts.length)} / ${texts.length}`);
  }

  console.log("Upserting to Pinecone...");
  const pc = new Pinecone({ apiKey: pineconeKey });
  const index = pc.index(INDEX_NAME);

  const upsertBatch = 100;
  for (let i = 0; i < allChunks.length; i += upsertBatch) {
    const batch = allChunks.slice(i, i + upsertBatch);
    const vectors = batch.map((c, j) => ({
      id: `${c.actName}_${i + j}`,
      values: allVectors[i + j],
      metadata: {
        text: c.text,
        act_name: c.actName,
        chunk_index: c.chunkIndex,
      },
    }));
    await index.namespace(NAMESPACE).upsert(vectors);
    console.log(`  Upserted ${Math.min(i + upsertBatch, allChunks.length)} / ${allChunks.length}`);
  }

  console.log("Ingest complete.");
}

main().catch(console.error);
