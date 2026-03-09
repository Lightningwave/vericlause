# VeriClause

Compliance verification for employment contracts (Singapore). Grounds every answer in the Singapore Employment Act and Workplace Fairness Act via RAG.

## Stack

- **Frontend + Backend**: Next.js (App Router, API Routes), TypeScript, Tailwind
- **LLM**: Groq (free) — extraction and compliance verdicts
- **Embeddings**: Google Gemini (free) — text-embedding-004
- **Vector DB**: Pinecone (free tier) — stores law chunks for RAG
- **Security**: Session-only in-memory storage, PII redaction, mandatory disclaimer

## Quick start

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in your API keys:

- `LLAMA_CLOUD_API_KEY` — from [LlamaCloud](https://cloud.llamaindex.ai/) (PDF parsing; supports complex/scanned docs)
- `GROQ_API_KEY` — from [Groq Console](https://console.groq.com/) (free)
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey) (free)
- `PINECONE_API_KEY` — from [Pinecone Console](https://app.pinecone.io/) (free tier)
- `PINECONE_INDEX` — name of your Pinecone index (default: `vericlause-laws`)

### 3. Ingest laws (once)

Place Singapore Employment Act and Workplace Fairness Act PDFs in `data/`. Then:

```bash
npx tsx scripts/ingest-laws.ts
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000. Accept the disclaimer, enter salary and work type, upload a contract PDF, and view the compliance report.

## Deploy to Vercel

Push to GitHub and import in Vercel. Set the same env vars (`GROQ_API_KEY`, `GEMINI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`) in the Vercel dashboard.

## Project layout

```
vericlause/
├── app/
│   ├── api/
│   │   ├── upload/route.ts       ← PDF upload + entity extraction
│   │   ├── analyze/route.ts      ← RAG compliance check
│   │   ├── document/[id]/route.ts ← document status
│   │   └── purge/[id]/route.ts   ← session cleanup
│   ├── globals.css, layout.tsx, page.tsx
├── components/                   ← disclaimer, onboarding, report UI
├── lib/
│   ├── api.ts                    ← simplified client (calls /api/* locally)
│   ├── types.ts                  ← shared TypeScript types
│   └── services/
│       ├── pdf.ts                ← pdf-parse (was PyPDF)
│       ├── extraction.ts         ← Groq extraction (was Python)
│       ├── redact.ts             ← PII masking (was Python)
│       ├── rag.ts                ← Pinecone + Gemini embeddings + Groq verdicts
│       └── store.ts              ← in-memory session store
├── scripts/
│   └── ingest-laws.ts            ← vectorize law PDFs (run with npx tsx)
├── data/                         ← place law PDFs here
```
