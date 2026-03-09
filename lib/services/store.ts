import { v4 as uuidv4 } from "uuid";
import type { ExtractedContract } from "@/lib/types";

interface StoredDocument {
  rawText: string;
  extracted: ExtractedContract | null;
  createdAt: number;
}

const docs = new Map<string, StoredDocument>();
const DOC_TTL_MS = 60 * 60 * 1000; // 1 hour

export function createDocumentId(): string {
  return uuidv4();
}

export function storeDocument(documentId: string, rawText: string): void {
  docs.set(documentId, {
    rawText,
    extracted: null,
    createdAt: Date.now(),
  });
}

export function getDocument(documentId: string): StoredDocument | undefined {
  return docs.get(documentId);
}

export function setExtracted(documentId: string, extracted: ExtractedContract): void {
  const doc = docs.get(documentId);
  if (doc) {
    doc.extracted = extracted;
  }
}

export function purgeDocument(documentId: string): void {
  docs.delete(documentId);
}

export function purgeExpired(): void {
  const now = Date.now();
  for (const [id, doc] of docs) {
    if (now - doc.createdAt > DOC_TTL_MS) {
      docs.delete(id);
    }
  }
}
