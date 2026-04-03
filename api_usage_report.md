# API Usage & Pricing Analysis Report

This document outlines all external API integrations within the VeriClause project, their specific usage contexts, models employed, and token/pricing considerations.

---

## 1. OpenAI
OpenAI is the primary "brain" of the application, handling complex analysis and high-volume data extraction.

| Feature | Model | Avg. Input Tokens | Avg. Output Tokens | Reasoning |
| :--- | :--- | :--- | :--- |
| **Contract Compliance** | `gpt-4o-mini` | ~200,000 | ~16,000 | 40 clauses * 2 RAG agent iterations * ~2.5k tokens per search turn. |
| **Contract Comparison** | `gpt-4o-mini` | ~12,000 | ~4,000 | Payload of 40-60 pre-analyzed verdicts + instruction prompt. |
| **Resume Profiling** | `gpt-4o-mini` | ~2,500 | ~1,000 | Raw resume text extraction + JSON mapping. |
| **Job Matching** | `gpt-4o-mini` | ~3,000 | ~1,200 | Resume context (~1.5k) + Job description (~2k) + instruction. |
| **Interview Seeds** | `gpt-4o-mini` | ~2,500 | ~500 | Full resume context + interviewer-specific persona prompts. |
| **RAG Embeddings** | `text-3-small` | ~2,000 | — | Per-clause queries during compliance RAG (40 clauses * 50 tokens). |

**Pricing Note:** `gpt-4o-mini` is highly cost-effective ($0.15 / 1M input tokens), but the agentic RAG loop multiplies consumption by the number of clauses analyzed.

---

## 2. ElevenLabs
Handles the conversational voice interface for practice interviews.

| Feature | Service | Usage Metric | Description |
| :--- | :--- | :--- | :--- |
| **Voice Interview** | Conversational AI Agents | Per Character / Min | Real-time TTS and STT orchestrator. Uses Agent IDs (Alex/Sophia). |
| **Resume Voice** | TTS (Text-to-Speech) | Per Character | Converts resume summaries into natural audio. |

**Pricing Note:** Billed based on characters generated. Voice interviews can consume significant character credits depending on interaction length.

---

## 3. Groq
Used as a high-speed inference layer and fallback.

| Feature | Model | Usage Context |
| :--- | :--- | :--- |
| **Direct Verdicts** | `llama-3.1-8b-instant` | Fallback for compliance checks when an agentic loop is not required or OpenAI is unavailable. |

**Pricing Note:** Groq is currently extremely competitive on pricing and speed, often used for "bursty" workloads.

---

## 4. LlamaCloud (LlamaIndex)
Dedicated parsing engine for complex document extraction.

| Feature | Tier | Context |
| :--- | :--- | :--- |
| **PDF Extraction** | `agentic` / `balanced` | Used to turn complex Employment Contract PDFs into structured JSON (Clause title + text). |

**Pricing Note:** Typically billed per page parsed. "Agentic" parsing is more accurate for multi-column layouts but more expensive.

---

## 5. Pinecone
Vector database for the RAG (Retrieval-Augmented Generation) system.

| Service | Index | Namespace | Purpose |
| :--- | :--- | :--- | :--- |
| **Vector Search** | `vericlause-laws` | `employment_act` | Stores embedded Singapore legislation and tripartite guidelines. |

**Pricing Note:** Charged based on "Read/Write Units" and storage. The current implementation uses one-time ingestion of laws.

---

## 6. Microsoft Azure (Alternative)
Used for specific UI features and as a secondary speech provider.

| Feature | Service | Purpose |
| :--- | :--- | :--- |
| **AI Avatar** | Azure Avatar Relay | WebRTC-based AI avatar visualization for interviews. |
| **Speech** | Cognitive Services | Speech-to-text / Text-to-speech tokens for specific locales. |

---

## 7. Supabase
Backend-as-a-Service for persistence and identity.

| Component | Usage |
| :--- | :--- |
| **Auth** | User sign-up/in and session management. |
| **Database** | PostgreSQL storage for resumes, contracts, and comparison jobs. |
| **Storage** | S3-compatible buckets for PDF uploads. |

---

## Summary for Pricing Tiers
To build a sustainable pricing model, consider the following costs:

### High-Cost Analyses
1. **Contract Analysis**: Heavily uses LlamaCloud (per page) + OpenAI (agentic loop per clause). **Estimate: $0.04 - $0.06 per contract.**
2. **Practice Interview**: Heavily uses ElevenLabs (per minute/character) + OpenAI (seed questions). **Estimate: $0.20 - $1.00 per session.** (ElevenLabs is the main cost driver here).

### Low-Cost Frequent Actions
3. **Contract Comparison**: Large context window comparing two documents. **Estimate: ~$0.01 per run.**
4. **Job Matching**: Matching a resume profile against a job description. **Estimate: ~$0.001 per run.**
5. **Resume Profiling**: Extracting structured data from a newly uploaded resume. **Estimate: ~$0.001 per run.**
