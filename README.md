# VeriClause

Compliance verification for Singapore employment contracts. Grounds every answer in the Singapore Employment Act, Workplace Fairness Act, and Tripartite Guidelines via agentic RAG — minimizing AI hallucination by citing only retrieved legal provisions.

## Contents

1. [Features](#features)  
2. [Stack](#stack)  
3. [Database](#database)  
4. [AI workflow](#ai-workflow)  
5. [Subscription & Billing](#subscription--billing)
6. [Quick start](#quick-start)  
7. [Deploy to Vercel](#deploy-to-vercel)  
8. [Project layout](#project-layout)  
---

## Features

- **Compliance Analysis** — Upload a contract PDF, extract every clause, and verify each against Singapore employment law using agentic RAG with cited legal provisions
- **Verdict Translation** — Translate compliance verdicts and explanations into Chinese or Tamil on demand
- **Contract Comparison** — Upload two contracts side-by-side, compare key terms and clauses with a better/worse/equal assessment from the employee's perspective
- **Market Benchmark** — Score contract terms (salary, leave, notice, probation) against typical Singapore market ranges for the role
- **PDF Viewer with Highlighting** — Split-view with clause-to-PDF location mapping so users can see exactly where each clause appears
- **Resume Onboarding & Profiling** — Upload PDF/DOCX resumes (integrated PII redaction) to generate structured professional profiles and AI-powered improvement suggestions
- **AI Interview Agent** — Real-time, voice-first interview preparation powered by Azure AI Avatar and Speech services
- **Job Discovery & Recommendations** — Personalized job matching based on your professional profile and market data

## Stack

- **Frontend + Backend**: Next.js 14 (App Router, API Routes), TypeScript, Tailwind CSS
- **Primary LLM**: OpenAI `gpt-4o-mini` — agentic extraction, compliance verdicts, translation, comparison, benchmarking
- **Fallback LLM**: Groq `llama-3.1-8b-instant` — non-agentic fallback when OpenAI fails
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Vector DB**: Pinecone (free tier) — stores law/guideline chunks for RAG
- **PDF Parsing (user contracts)**: LlamaCloud / LlamaParse — agentic tier with OCR
- **PDF Parsing (law database)**: Docling (local Python) — saves API tokens
- **Auth**: Supabase Auth
- **Database**: Supabase PostgreSQL — documents, reports, resumes, profiling jobs, extracted data
- **File Storage**: Supabase Storage — `contracts` (PDFs), `resumes` (PDF/DOCX originals)
- **Security**: PII redaction (NRIC, names, emails, phone), mandatory disclaimer

## Database

All application data lives in **Supabase PostgreSQL** with **Row Level Security (RLS)** enabled. API routes use the Supabase server client with the user’s session; policies ensure each user only reads/writes their own rows.

### PostgreSQL tables

| Table | Purpose |
|--------|---------|
| **`documents`** | Uploaded employment contracts: `raw_text`, `extracted` (JSON — `ExtractedContract`), optional `file_path` to Storage |
| **`reports`** | Compliance results: `verdicts` (JSON array), `compliance_score`, linked to `document_id` |
| **`analysis_jobs`** | Async contract analysis: `status` (`queued` / `running` / `succeeded` / `failed`), `error`, optional `report_id` — used when analyze exceeds the wait window |
| **`resumes`** | Resume uploads: `raw_text`, `parsed_profile`, `ai_suggestions`, `image_urls` (JSON), optional `file_path` |
| **`profiling_jobs`** | Async resume profiling: `status`, `error`, linked to `resume_id` |

Foreign keys tie rows to **`auth.users`**. Indexes exist on `user_id` and key foreign keys (see `supabase/migration.sql`).

### Row Level Security

- Policies use **`auth.uid() = user_id`** (or ownership through joined tables) for `SELECT` / `INSERT` / `UPDATE` / `DELETE` as defined per table.  
- The app never bypasses RLS for user data in normal operation.

### Storage buckets

| Bucket | Content | Access |
|--------|---------|--------|
| **`contracts`** | Original contract PDFs | Private; object path is scoped so the first folder segment is the user id |
| **`resumes`** | Original resume PDF/DOCX | Same pattern |

### Vector data (not in Postgres)

**Pinecone** holds embedded chunks of Singapore law/guidelines for RAG (`PINECONE_INDEX`, 1536-d embeddings). Ingest via `scripts/ingest-laws.ts` after preparing `data/laws-parsed/`.

### Applying migrations

Run **`supabase/migration.sql`** in the Supabase SQL Editor on a new project. If your project predates resume tables, also apply **`supabase/migration_resume_onboarding.sql`** when present, or merge the resume section from the main migration file.

## AI Workflow

### Long-running jobs — contracts and resumes use the **same** pattern

**Contract analysis** (`POST /api/contracts/analyze`) and **resume profiling** (`POST /api/resumes` / `POST /api/resumes/profile`, via `lib/services/resumeProfiling.ts`) both:

1. Create a **job row** in the database.
2. Run the LLM work in the background.
3. **`Promise.race`** that work against a **wait window** (default **25 seconds**).
4. **Fast path:** respond with `status: "succeeded"` and the full result in one JSON body.
5. **Slow path:** respond with `status: "running"` and `job_id` — the client **polls** until done:
   - Contracts: `GET /api/contracts/analyze/[job_id]`
   - Resumes: `GET /api/resumes/profile/[job_id]`

**Environment variables:** `ANALYZE_TIMEOUT_MS` controls the contract analyze wait. Profiling uses **`RESUME_PROFILE_WAIT_MS`** if set, otherwise the same **`ANALYZE_TIMEOUT_MS`**, otherwise `25000`. Keeping these aligned is intentional so both features behave consistently.

### Resume onboarding (`POST /api/resumes` starts profiling)

```
PDF / DOCX file
  │
  ▼
LlamaCloud Parse (agentic tier, OCR)
  │  → markdown text
  │  → screenshot URLs (for gpt-4o vision in profiling)
  │
  ▼
PII redaction on stored text (NRIC, names, emails, phone)
  │
  ▼
Supabase (resumes row + optional upload to `resumes` bucket)
  │
  ▼
Same request: profiling job (shared logic with POST /api/resumes/profile) — OpenAI gpt-4o structured profile + ai_suggestions
  │  → fast path: succeeds in RESUME_PROFILE_WAIT_MS / ANALYZE_TIMEOUT_MS
  │  → slow path: { status: "running", job_id } → poll GET /api/resumes/profile/[job_id]
  │  → optional: POST /api/resumes/profile to re-profile an existing resume
  │
  ▼
Supabase (update parsed_profile, ai_suggestions)
```


**Resume status (for nav / job gates):** `GET /api/resumes/status` returns `{ has_resume, has_profile, resume_id }` (lightweight; uses `resumes.user_id`). On the client, use `getResumeStatus()` from `lib/api.ts` or `useResumeStatus()` from `components/providers/resume-status-provider.tsx` (provider is wired in `app/layout.tsx`). Call `refetch()` after upload/profiling so UI stays in sync.

**Profiling job polling (`GET /api/resumes/profile/[job_id]`):** Returns `{ job, resume }`. When the job is **succeeded** or **failed**, the latest **resume** row is attached when available so the client can refresh profile data after slow paths or errors.

### AI Interview Agent (`app/interview`)

The interview agent provides a real-time conversational experience for job preparation.

1. **Speech Token (`GET /api/azure/speech-token`):** Fetches a temporary authentication token for Azure Cognitive Services (Speech-to-Text and Text-to-Speech).
2. **Avatar Relay (`POST /api/azure/avatar-relay`):** Routes interaction data to the Azure AI Avatar service for low-latency visual feedback.
3. **Voice Interaction:** Uses the `microsoft-cognitiveservices-speech-sdk` for high-fidelity audio transcription and synthesis.
4. **Contextual Intelligence:** The interviewer agent uses the user's analyzed resume profile to ask relevant, role-specific questions.

### Job Discovery & Matching (`app/jobs`)

Personalized job recommendations are generated by matching the user's extracted profile against market data.

1. **Matching Engine:** Compares skills, experience, and seniority from the resume profile against job requirements.
2. **Scoring:** Provides a match score (0-100%) with detailed reasoning, strengths, and areas for improvement.
3. **Actionable Steps:** Direct links to original job listings and integrated "Prepare for Interview" paths.

### Stage 1: Upload (`POST /api/contracts/upload`)

Legacy `POST /api/upload` is rewritten to this route (see `next.config.mjs`).

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

### Stage 2: Analyze (`POST /api/contracts/analyze`)

Poll `GET /api/contracts/analyze/[job_id]` when the POST returns `status: "running"`. Legacy `/api/analyze` URLs are rewritten.

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

### Stage 3: Translate (`POST /api/contracts/translate`)

```
Verdicts array + language code (`zh` | `ta` | `ms`)
  │
  ▼
OpenAI gpt-4o-mini — Legal Translation
  │  → translates explanation, contract_value, law_value
  │  → keeps statute citations in English
  │
  ▼
Returns verdicts with translated_* fields
```

Translation runs on-demand when the user selects a language from the dropdown, keeping the initial analysis fast.

### Stage 4: Compare (`POST /api/compare`)

```
Document A ID + Document B ID
  │
  ▼
Load both extracted contracts from Supabase
  │
  ▼
OpenAI gpt-4o-mini — Structured Comparison
  │  → key_terms[]: salary, leave, notice, probation side-by-side
  │  → clauses[]: clause-by-clause diff with assessment
  │  → summary: overall 2-3 sentence comparison
  │
  ▼
Assessment from employee's perspective:
  a_better | b_better | equal | different
```

### Stage 5: Benchmark (`POST /api/contracts/benchmark`)

```
Job title + extracted key terms (salary, leave, notice, probation)
  │
  ▼
OpenAI gpt-4o-mini — Market Analysis
  │  → items[]: each term vs SG market range for the role
  │  → assessment: above | at | below market
  │  → overall_summary
  │
  ▼
Framed as indicative estimates (disclaimer included)
```

**Contract API namespace:** list / detail / PDF use `GET /api/contracts`, `GET /api/contracts/[id]`, `GET /api/contracts/[id]/pdf`. Legacy `/api/documents/...` paths are rewritten in `next.config.mjs`. **`lib/api.ts`** calls these contract routes for the dashboard client.

**Resume & Profiling API namespace:**
- `POST /api/resumes`: Upload PDF/DOCX (redacts PII) -> starts profiling job
- `GET /api/resumes`: List all resumes for user
- `GET /api/resumes/status`: Check completion (has_resume, has_profile)
- `POST /api/resumes/profile`: Manually trigger/re-run profiling
- `GET /api/resumes/profile/[job_id]`: Poll status (returns status + profile when done)

**Azure AI API namespace:**
- `GET /api/azure/speech-token`: Azure Speech SDK token
- `POST /api/azure/avatar-relay`: Azure AI Avatar session relay

## Subscription & Billing

VeriClause supports highly configurable billing tiers built atop Stripe, utilizing Supabase to store and enforce limits.

### Architecture
All SaaS infrastructure relies on the single source of truth database model:
- **`profiles` table**: Upon sign up, a Postgres Trigger creates a free profile storing their `stripe_customer_id`, current `plan` string (e.g. `free`, `pro`, `business`), and expiration info.
- **Access Middleware**: Found in `lib/billing/access.ts`, these internal functions lookup the user `plan` and return `planKey` structures mapping limits securely before any feature triggers.

### Usage Engine & Features Tracked
We track exact consumption directly via Supabase `row count` checks, entirely skipping the need for manual usage counters, eliminating sync issues. Found in `lib/billing/usage.ts`:
- **Contract Analyses**: Enforced as a `lifetime` or `month` window depending on the tier. Tracks successful analyses via the `reports` table.
- **AI Reviews**: Enforced strictly as a `day` window (e.g., resets at midnight). Tracks uploaded analyses via the `resumes` table.
- Both metrics are streamed to the frontend `/profile` page via `/api/billing/usage/route.ts` where they're displayed via Progress bars using the `useUsage()` hook.

### Stripe Integration Workflow
1. **Upgrading (`/api/billing/checkout`)**: Redirects users to Stripe. Passes `client_reference_id` set to the User ID.
2. **Syncing (`/api/billing/webhook`)**: Responds to `checkout.session.completed` and `customer.subscription.updated`. Upgrades/Downgrades are applied reliably in the background without relying on client-side JS.
3. **Managing (`/api/billing/portal`)**: Secure Customer Billing Portal redirect to allow users self-service management (Cancellations, Card updates) safely off-premises.

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
| `AZURE_SPEECH_KEY` | [Azure Portal](https://portal.azure.com/) | Azure Speech-to-Text / TTS |
| `AZURE_SPEECH_REGION` | — | e.g. `southeastasia` |
| `AZURE_AVATAR_ENDPOINT` | — | Endpoint for Azure AI Avatar |

### 3. Set up Supabase

Run **`supabase/migration.sql`** to create tables, RLS policies, and storage buckets (see [Database](#database)). Add resume-related objects if you use an older project without them.

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
│   │   ├── contracts/               ← upload, analyze, translate, compare, benchmark, [id], pdf, …
│   │   ├── resumes/                 ← POST/GET resumes, profile, profile/[job_id], [id], status
│   │   └── azure/                   ← speech-token, avatar-relay
│   ├── auth/                        ← sign-in, sign-up
│   ├── contract/                    ← analysis + compare pages (/contract, /contract/compare)
│   ├── resume/                      ← review, builder, voice
│   ├── jobs/                        ← discovery, recommendation
│   ├── interview/
│   ├── page.tsx                     ← landing
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── layout/                      ← SiteNavbar, language-switcher
│   ├── auth/                        ← AuthShell, AuthForm
│   ├── contract/                    ← analysis page, viewer, panels, compare, disclaimer, …
│   ├── interview/
│   └── providers/                   ← language, resume-status
├── lib/
│   ├── api.ts                       ← browser client (401 → ApiUnauthorizedError)
│   ├── types.ts
│   ├── i18n/
│   └── services/                    ← pdf, resume, resumeProfiling, extraction, redact, rag, db, …
├── scripts/                       ← docling_parse_laws.py, ingest-laws.ts
├── data/                          ← laws/, laws-parsed/
├── supabase/                      ← migration.sql (+ resume onboarding SQL if split)
├── next.config.mjs                ← rewrites + redirects
├── middleware.ts
└── public/
```
