# VeriClause

Compliance verification for Singapore employment contracts. Grounds every answer in the Singapore Employment Act, Workplace Fairness Act, and Tripartite Guidelines via agentic RAG — minimizing AI hallucination by citing only retrieved legal provisions.

## Stack

- **Frontend + Backend**: Next.js 14 (App Router, API Routes), TypeScript, Tailwind CSS
- **Primary LLM**: OpenAI `gpt-4o-mini` — agentic extraction and compliance verdicts
- **Fallback LLM**: Groq `llama-3.1-8b-instant` — non-agentic fallback when OpenAI fails
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Vector DB**: Pinecone (free tier) — stores law/guideline chunks for RAG
- **PDF Parsing (user contracts)**: LlamaCloud / LlamaParse — agentic tier with OCR
- **PDF Parsing (law database)**: Docling (local Python) — saves API tokens
- **Auth**: Supabase Auth
- **Database**: Supabase PostgreSQL — documents, reports, extracted data
- **File Storage**: Supabase Storage (S3-compatible) — uploaded PDFs
- **Security**: PII redaction (NRIC, names, emails, phone), mandatory disclaimer

## AI Workflow

### Stage 1: Upload (`POST /api/upload`)

```
PDF file
  │
  ▼
LlamaCloud Parse (agentic tier, OCR)
  │  → markdown (primary text representation)
  │  → per-page items with bounding boxes (for highlighting)
  │
  ▼
PII Redaction (regex: NRIC, names, emails, phone numbers)
  │
  ▼
OpenAI gpt-4o-mini — Entity Extraction        (fallback: Groq)
  │  → key_terms: salary, job title, notice period, leave, etc.
  │  → clauses[]: every distinct clause with title + verbatim text
  │
  ▼
Clause Location Mapping
  │  → fuzzy-matches each clause to LlamaParse page items
  │  → stores page number, bounding box, source anchor text
  │
  ▼
Supabase (save document + upload PDF to storage)
```

### Stage 2: Analyze (`POST /api/analyze`)

```
For each clause (4 concurrent):
  ┌──────────────────────────────────────────────┐
  │  OpenAI gpt-4o-mini (agentic loop)           │
  │                                              │
  │  1. Agent reads clause                       │
  │  2. Calls search_law("annual leave SG")      │
  │       → OpenAI embed → Pinecone top-5        │
  │       → returns labelled law excerpts         │
  │         [Source: Employment Act 1968]         │
  │         [Source: Tripartite Guidelines]       │
  │  3. Agent evaluates and calls submit_verdict │
  │       → verdict: compliant/caution/violated  │
  │       → citation: "EA s88(1)"                │
  │       → explanation: "7 days meets minimum"  │
  └──────────────────────────────────────────────┘
              │  (fallback: Groq one-shot)
              ▼
Score calculation (compliant=100, caution=50, violated=0)
              │
              ▼
Supabase (save report with verdicts + score)
```

Key design decisions:
- **Binding law vs advisory guidelines**: violations of EA/WFA → "violated"; non-compliance with Tripartite Guidelines → "caution" (advisory only)
- **Forced verdict**: on the final iteration, `tool_choice` forces `submit_verdict` so the agent always produces a result
- **Text fallback**: if the agent responds with plain text instead of a tool call, the system attempts to parse a verdict from the text

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in your API keys:

| Variable | Source | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | [OpenAI](https://platform.openai.com/api-keys) | Primary LLM + embeddings |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/) (free) | Fallback LLM |
| `LLAMA_CLOUD_API_KEY` | [LlamaCloud](https://cloud.llamaindex.ai/) | PDF parsing (user contracts) |
| `PINECONE_API_KEY` | [Pinecone Console](https://app.pinecone.io/) (free tier) | Vector database |
| `PINECONE_INDEX` | — | Index name (default: `vericlause-laws`, 1536 dims) |
| `NEXT_PUBLIC_SUPABASE_URL` | [Supabase](https://supabase.com/) | Auth + database |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard | Auth + database |

### 3. Set up Supabase

Run the migration in `supabase/migration.sql` against your Supabase project to create the required tables (`documents`, `reports`) and enable Row Level Security.

### 4. Ingest law database (once)

#### a. Parse law PDFs with Docling (local Python)

Place Singapore law PDFs in `data/laws/`:
- `Employment Act 1968.pdf`
- `Workplace Fairness Bill.pdf`
- `Employment Claims Act 2016.pdf`
- Tripartite Guidelines PDFs
- Key Employment Terms PDF

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install docling
python scripts/docling_parse_laws.py
```

This outputs markdown files to `data/laws-parsed/`.

#### b. Embed and upsert to Pinecone

```bash
npx tsx scripts/ingest-laws.ts
```

Creates a Pinecone index with 1536-dimension vectors (OpenAI `text-embedding-3-small`), storing each chunk with `text` and `act_name` metadata.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000. Sign up / log in, upload a contract PDF, and view the compliance report.

## Deploy to Vercel

Push to GitHub and import in Vercel. Set all env vars from the table above in the Vercel dashboard.

## Project Layout

```
vericlause/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          ← PDF upload + extraction
│   │   ├── analyze/route.ts         ← agentic RAG compliance check
│   │   ├── document/[id]/route.ts   ← document status
│   │   └── purge/[id]/route.ts      ← data cleanup
│   ├── dashboard/page.tsx           ← main dashboard (PDF viewer + clause panel)
│   ├── page.tsx                     ← landing page
│   ├── layout.tsx, globals.css
├── components/
│   ├── ContractViewer.tsx           ← PDF viewer with text highlighting
│   ├── ClausePanel.tsx              ← clause list + verdict badges
│   ├── SiteNavbar.tsx               ← navigation bar
│   ├── AuthShell.tsx                ← auth-gated layout wrapper
│   ├── DisclaimerModal.tsx          ← legal disclaimer
│   └── ...
├── lib/
│   ├── api.ts                       ← client-side API helpers
│   ├── types.ts                     ← shared TypeScript interfaces
│   └── services/
│       ├── pdf.ts                   ← LlamaCloud PDF parsing
│       ├── extraction.ts            ← LLM entity/clause extraction
│       ├── redact.ts                ← PII masking (NRIC, names, emails, phone)
│       ├── rag.ts                   ← agentic RAG (OpenAI primary, Groq fallback)
│       └── db.ts                    ← Supabase database + storage operations
├── scripts/
│   ├── docling_parse_laws.py        ← parse law PDFs locally with Docling
│   └── ingest-laws.ts              ← embed + upsert law chunks to Pinecone
├── data/
│   ├── laws/                        ← source law PDFs
│   └── laws-parsed/                 ← Docling markdown output
├── supabase/
│   └── migration.sql                ← database schema + RLS policies
└── public/                          ← logo, favicon
```
