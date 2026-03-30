# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VeriClause is a full-stack employment contract compliance analyzer for Singapore. It uses an agentic RAG system to evaluate contract clauses against Singapore employment law, with additional features for resume profiling, AI interview coaching, and job recommendations.

## Commands

```bash
npm run dev     # Start Next.js dev server (port 3000)
npm run build   # Production build
npm run lint    # ESLint

# Law ingestion pipeline (one-time setup or when laws change)
python scripts/docling_parse_laws.py        # Parse law PDFs → data/laws-parsed/*.md
npx tsx scripts/ingest-laws.ts              # Embed & upsert chunks to Pinecone

# DB migrations: run supabase/migration.sql in Supabase SQL Editor
```

No test framework is configured.

## Architecture

**Stack**: Next.js 14 (App Router) + React 18 + TypeScript 5 + Supabase (PostgreSQL + Auth) + Tailwind CSS

**LLM chain**: OpenAI gpt-4o-mini (primary) → Groq llama-3.1-8b-instant (fallback). Embeddings via OpenAI text-embedding-3-small stored in Pinecone. PDF parsing via LlamaCloud.

### Async Job Pattern

Both contract analysis and resume profiling use the same pattern:
1. Create a job row in Supabase (`status: queued`)
2. Start LLM work in background (not awaited)
3. `Promise.race` against `ANALYZE_TIMEOUT_MS` / `RESUME_PROFILE_WAIT_MS`
4. Fast path: completes within timeout → return result inline
5. Slow path: timeout → return `{ status: "running", job_id }` → client polls `GET .../[job_id]`

### RAG Compliance Analysis (`lib/services/rag.ts`)

Uses OpenAI function-calling agent loop with two tools:
- `search_law(query)` → Pinecone vector search → top-5 Singapore law excerpts
- `submit_verdict(verdict, citation, explanation)` → records compliance result

Clauses are analyzed 4 at a time via `Promise.allSettled`. Falls back to Groq one-shot if OpenAI fails.

### Authentication

Supabase Auth (JWT). `middleware.ts` refreshes tokens on every request via `updateSession`. Server-side Supabase client in `lib/supabase/server.ts`. API routes authenticate via `getAuthenticatedUser()`.

### Database

Supabase PostgreSQL with RLS (`auth.uid() = user_id` on every table). Schema in `supabase/migration.sql`. Key tables: `documents`, `reports`, `analysis_jobs`, `resumes`, `profiling_jobs`, `comparison_jobs`.

### Key Services (`lib/services/`)

- `extraction.ts` — LLM-based contract entity extraction from raw text
- `rag.ts` — Agentic compliance analysis with Pinecone RAG
- `resumeProfiling.ts` — Resume analysis with async job pattern
- `pdf.ts` — PDF parsing via LlamaCloud
- `redact.ts` — Regex PII redaction (NRIC, names, emails, phone) before DB storage
- `db.ts` — Supabase query helpers for documents/reports

### API Route Organization

All under `app/api/`:
- `contracts/` — upload, analyze (with `[job_id]` polling), translate, compare, benchmark
- `resumes/` — CRUD, profile (with `[job_id]` polling), status
- `azure/` — speech-token, avatar-relay
- `jobs/` — recommend, scrape
- `interview/` — coaching

Legacy rewrites in `next.config.mjs`: `/api/upload` → `/api/contracts/upload`, `/api/analyze` → `/api/contracts/analyze`

### State Management

No external state library. Two React Context providers wired in `app/layout.tsx`:
- **LanguageProvider** (`components/providers/language-provider.tsx`) — UI language (en, zh, ta, ms); translations in `lib/i18n/translations/`
- **ResumeStatusProvider** (`components/providers/resume-status-provider.tsx`) — `useResumeStatus()` returns `{ has_resume, has_profile, resume_id }`, used for nav gates

### Supabase Clients

- `lib/supabase/client.ts` — Browser client (`createBrowserClient`)
- `lib/supabase/server.ts` — Server client (`createServerClient`) for API routes
- `lib/supabase/middleware.ts` — Session refresh logic used by root `middleware.ts`

### Styling

Tailwind CSS with custom navy + gold color palette and Inter (sans) + Merriweather (serif) fonts. Config in `tailwind.config.ts`.

## Import Alias

`@/*` maps to project root (configured in tsconfig.json).

## Environment Variables

Required in `.env.local`: `OPENAI_API_KEY`, `GROQ_API_KEY`, `LLAMA_CLOUD_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_AVATAR_ENDPOINT`. Optional timeouts: `ANALYZE_TIMEOUT_MS` (default 25000), `RESUME_PROFILE_WAIT_MS`.

## Key Types

Core type definitions in `lib/types.ts`: `ExtractedContract`, `ComplianceVerdict`, `ResumeProfile`.
