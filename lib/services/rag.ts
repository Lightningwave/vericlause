import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import Groq from "groq-sdk";
import type {
  ComplianceVerdict,
  ExtractedContract,
  EmployeeContext,
} from "@/lib/types";

const INDEX_NAME = process.env.PINECONE_INDEX || "vericlause-laws";
const NAMESPACE = "employment_act";
const TOP_K = 6;
const MAX_AGENT_ITERATIONS = 8;
const OPENAI_MODEL = "gpt-4o-mini";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;
const CONCURRENCY = 4;
const MAX_CLAUSES_DEFAULT = 40;
const MAX_CLAUSE_CHARS_DEFAULT = 6000;

// ---------------------------------------------------------------------------
// Singleton clients
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

let _groq: Groq | null = null;
function getGroqClient(): Groq {
  if (!_groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not set");
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

let _pineconeIndex: ReturnType<Pinecone["index"]> | null = null;
function getPineconeIndex() {
  if (!_pineconeIndex) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) throw new Error("PINECONE_API_KEY not set");
    const pc = new Pinecone({ apiKey });
    _pineconeIndex = pc.index(INDEX_NAME);
  }
  return _pineconeIndex;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: unknown }).status
          : undefined;
      const isRateLimit = status === 429;
      if (!isRateLimit || attempt === MAX_RETRIES - 1) throw err;
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Employee context → Part IV applicability
// ---------------------------------------------------------------------------

function derivePartIVApplicability(ctx: EmployeeContext): string {
  const salary = ctx.monthly_salary;
  const wt = ctx.work_type;

  if (salary === null || salary === 0) {
    return "Employee salary was not provided. Part IV applicability is unknown — use caution for overtime, rest day, and working hour provisions.";
  }

  if (wt === "manual") {
    if (salary <= 4500) {
      return `Employee is a workman earning SGD ${salary}/month (≤ $4,500). Part IV of the Employment Act APPLIES. Statutory caps on working hours, overtime rates, rest day pay, and other Part IV protections are enforceable.`;
    }
    return `Employee is a workman earning SGD ${salary}/month (> $4,500). Part IV does NOT apply. However, core EA provisions (salary payment, leave, termination notice) still apply.`;
  }

  // office / non-workman
  if (salary <= 2600) {
    return `Employee is a non-workman earning SGD ${salary}/month (≤ $2,600). Part IV of the Employment Act APPLIES. Statutory caps on working hours, overtime rates, rest day pay, and other Part IV protections are enforceable.`;
  }
  return `Employee is a non-workman earning SGD ${salary}/month (> $2,600). Part IV does NOT apply. However, core EA provisions (salary payment, leave, termination notice) still apply.`;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_employment_act",
      description:
        "Search the Singapore Employment Act for statutory provisions on a topic. " +
        "Use for: salary, working hours, overtime, rest days, leave entitlements, " +
        "notice periods, termination, salary deductions, public holidays, Part IV provisions.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Specific legal query, e.g. 'minimum annual leave entitlement' or 'salary deduction limits'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_ket_requirements",
      description:
        "Search the Key Employment Terms (KETs) requirements — the mandatory written terms " +
        "that every employer must provide under Singapore law. Use this to check if a clause " +
        "properly addresses a mandatory KET field (e.g. salary breakdown, leave entitlement, " +
        "working hours, overtime rates, deductions, place of work).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The KET field to check, e.g. 'salary period and basic rate of pay' or 'fixed deductions from salary'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_guidelines",
      description:
        "Search Tripartite Guidelines and the Workplace Fairness Act. " +
        "Use for: fair employment practices, flexible work arrangements (FWA), " +
        "wrongful dismissal, re-employment of older employees, workplace discrimination, " +
        "and workplace fairness provisions. Note: Tripartite Guidelines are advisory (not legally binding), " +
        "while the Workplace Fairness Act is binding statute.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Specific query, e.g. 'flexible work arrangement request process' or 'wrongful dismissal grounds'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_verdict",
      description:
        "Submit your final compliance verdict. You MUST call this exactly once. Never respond with plain text.",
      parameters: {
        type: "object",
        properties: {
          clause_type: {
            type: "string",
            description: "The clause title",
          },
          contract_value: {
            type: "string",
            description: "Brief summary of what the contract says",
          },
          law_value: {
            type: "string",
            description: "What the law/guideline requires, based on retrieved excerpts",
          },
          verdict: {
            type: "string",
            enum: ["compliant", "caution", "violated"],
            description:
              "compliant = meets or exceeds law, violated = below statutory minimum, caution = ambiguous / only advisory guideline applies / missing information",
          },
          citation: {
            type: "string",
            description:
              "Specific legal reference (e.g. 'EA s88(1)', 'KETs Schedule para 3', 'Tripartite Guidelines on FWA, para 5', 'WFA s12')",
          },
          explanation: {
            type: "string",
            description: "One to three sentences explaining the verdict, including Part IV applicability if relevant",
          },
        },
        required: ["clause_type", "contract_value", "law_value", "verdict", "explanation"],
      },
    },
  },
];

function buildSystemPrompt(ctx: EmployeeContext): string {
  const partIV = derivePartIVApplicability(ctx);

  return `You are an expert Singapore employment law compliance agent. You analyze individual contract clauses against Singapore legislation and guidelines.

## Employee Context
${partIV}

## Knowledge Base
You can search three specialized databases:

1. **search_employment_act** — The Employment Act (EA): binding statute covering salary, leave, working hours, overtime, rest days, notice periods, termination, Part IV provisions, etc.
2. **search_ket_requirements** — Key Employment Terms (KETs): mandatory written terms every employer must provide. Check if the contract clause properly addresses the required KET fields.
3. **search_guidelines** — Tripartite Guidelines (advisory, NOT legally binding) on: fair employment, flexible work arrangements (FWA), wrongful dismissal, re-employment of older employees. Also includes the Workplace Fairness Act (WFA, binding statute on discrimination).

## Search Strategy
Think about WHICH database is most relevant before searching:
- Salary, leave, hours, overtime, notice, termination → search_employment_act
- Whether mandatory written terms are complete → search_ket_requirements
- Discrimination, FWA, wrongful dismissal, re-employment → search_guidelines
- If a clause could involve both statute and guidelines, search both (one call each)

## Verdict Rules
1. **Binding statute violated** (EA, WFA, Employment Claims Act) → verdict "violated"
2. **Tripartite Guideline not followed** (advisory only) → verdict "caution" (NOT "violated")
3. **Part IV provision violated but Part IV does not apply to this employee** → verdict "compliant" (explain that Part IV threshold is not met)
4. **Mandatory KET field missing or incomplete** → verdict "caution" with citation to KETs Schedule
5. **Everything met** → verdict "compliant"
6. **Insufficient information to determine** → verdict "caution"

## Workflow
1. Read the clause and determine which database(s) to search
2. Call the relevant search tool(s) — be targeted and efficient (1-3 searches total)
3. Evaluate results considering Part IV applicability
4. Call submit_verdict with citation and explanation

CRITICAL: Always call submit_verdict. Never respond with plain text.`;
}

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

async function embedQuery(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const result = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return result.data[0].embedding;
}

interface LawChunk {
  text: string;
  actName: string;
}

export async function retrieveLawChunks(
  query: string,
  topK = TOP_K,
): Promise<LawChunk[]> {
  const index = getPineconeIndex();
  const vector = await embedQuery(query);
  const res = await index.namespace(NAMESPACE).query({
    vector,
    topK,
    includeMetadata: true,
  });
  return (res.matches ?? [])
    .map((m) => {
      const meta = m.metadata as Record<string, unknown> | undefined;
      return {
        text: (meta?.text as string) ?? "",
        actName: (meta?.act_name as string) ?? "Unknown",
      };
    })
    .filter((c) => c.text.length > 0);
}

function formatChunksForAgent(chunks: LawChunk[]): string {
  if (chunks.length === 0)
    return "No relevant excerpts found for this query. Try different search terms or a different tool.";

  return chunks
    .map(
      (c, i) => `[Excerpt ${i + 1} — Source: ${c.actName}]\n${c.text}`,
    )
    .join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Text verdict fallback parser
// ---------------------------------------------------------------------------

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }

  return text.trim();
}

function tryParseTextVerdict(
  text: string,
  clauseTitle: string,
  clauseText: string,
): ComplianceVerdict | null {
  const jsonStr = extractJson(text);
  try {
    const data = JSON.parse(jsonStr) as Record<string, unknown>;
    if (data.verdict && typeof data.verdict === "string") {
      const v = data.verdict as string;
      return {
        clause_type: (data.clause_type as string) ?? clauseTitle,
        contract_value: (data.contract_value as string) ?? clauseText.slice(0, 200),
        law_value: (data.law_value as string) ?? null,
        verdict: (["compliant", "caution", "violated"].includes(v)
          ? v
          : "caution") as ComplianceVerdict["verdict"],
        citation: (data.citation as string) ?? null,
        explanation: (data.explanation as string) ?? null,
      };
    }
  } catch {
    // not JSON
  }

  const lower = text.toLowerCase();
  let verdict: ComplianceVerdict["verdict"] = "caution";
  if (lower.includes("violated") || lower.includes("non-compliant") || lower.includes("does not comply")) {
    verdict = "violated";
  } else if (lower.includes("compliant") || lower.includes("complies") || lower.includes("meets the requirement")) {
    verdict = "compliant";
  }

  if (text.length > 20) {
    return {
      clause_type: clauseTitle,
      contract_value: clauseText.slice(0, 200),
      law_value: null,
      verdict,
      citation: null,
      explanation: text.slice(0, 300),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Tool dispatch — route specialized tools to the same Pinecone index
// but with contextual query augmentation
// ---------------------------------------------------------------------------

async function executeToolCall(
  toolName: string,
  args: Record<string, string>,
): Promise<string> {
  const query = args.query ?? "";

  switch (toolName) {
    case "search_employment_act": {
      const augmented = query + " Employment Act Singapore";
      const chunks = await retrieveLawChunks(augmented);
      const eaChunks = chunks.filter((c) => {
        const name = c.actName.toLowerCase();
        return name.includes("employment act") || name.includes("employment claims");
      });
      return formatChunksForAgent(eaChunks.length > 0 ? eaChunks : chunks);
    }

    case "search_ket_requirements": {
      const augmented = query + " key employment terms KETs mandatory written";
      const chunks = await retrieveLawChunks(augmented);
      const ketChunks = chunks.filter((c) =>
        c.actName.toLowerCase().includes("ket"),
      );
      return formatChunksForAgent(ketChunks.length > 0 ? ketChunks : chunks);
    }

    case "search_guidelines": {
      const augmented = query + " tripartite guidelines workplace fairness";
      const chunks = await retrieveLawChunks(augmented);
      const guidelineChunks = chunks.filter((c) => {
        const name = c.actName.toLowerCase();
        return name.includes("tripartite") || name.includes("fairness") || name.includes("guideline");
      });
      return formatChunksForAgent(guidelineChunks.length > 0 ? guidelineChunks : chunks);
    }

    default:
      return "Unknown tool. Use search_employment_act, search_ket_requirements, or search_guidelines.";
  }
}

// ---------------------------------------------------------------------------
// Primary: OpenAI agentic verdict loop
// ---------------------------------------------------------------------------

async function agentVerdictForClause(
  clauseTitle: string,
  clauseText: string,
  ctx: EmployeeContext,
): Promise<ComplianceVerdict> {
  const client = getOpenAIClient();
  const systemPrompt = buildSystemPrompt(ctx);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Analyze this contract clause for compliance with Singapore law.\n\nClause title: ${clauseTitle}\nClause text: ${clauseText}`,
    },
  ];

  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
    const isLast = iteration === MAX_AGENT_ITERATIONS - 1;

    const response = await withRetry(() =>
      client.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        tools: TOOLS,
        tool_choice: isLast
          ? { type: "function", function: { name: "submit_verdict" } }
          : "auto",
        temperature: 0,
      }),
    );

    const choice = response.choices[0];
    const assistantMessage = choice.message;
    messages.push(assistantMessage);

    if (
      !assistantMessage.tool_calls ||
      assistantMessage.tool_calls.length === 0
    ) {
      const textContent = assistantMessage.content ?? "";
      const parsed = tryParseTextVerdict(textContent, clauseTitle, clauseText);
      if (parsed) return parsed;

      messages.push({
        role: "user",
        content:
          "You must call the submit_verdict tool to finalize your analysis. Do not respond with plain text.",
      });
      continue;
    }

    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type !== "function") continue;

      const fnName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments) as Record<string, string>;

      if (fnName === "submit_verdict") {
        return {
          clause_type: args.clause_type ?? clauseTitle,
          contract_value: args.contract_value ?? clauseText.slice(0, 200),
          law_value: args.law_value ?? null,
          verdict: (["compliant", "caution", "violated"].includes(args.verdict)
            ? args.verdict
            : "caution") as ComplianceVerdict["verdict"],
          citation: args.citation ?? null,
          explanation: args.explanation ?? null,
        };
      }

      const result = await executeToolCall(fnName, args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return {
    clause_type: clauseTitle,
    contract_value: clauseText.slice(0, 200),
    law_value: null,
    verdict: "caution",
    citation: null,
    explanation: "Agent did not reach a verdict within the allowed iterations.",
  };
}

// ---------------------------------------------------------------------------
// KET completeness check
// ---------------------------------------------------------------------------

const MANDATORY_KETS = [
  "Full name of employer",
  "Full name of employee",
  "Job title and main duties",
  "Start date of employment",
  "Duration of employment (if fixed-term)",
  "Working arrangements (daily working hours, number of working days per week, rest day)",
  "Salary period and basic rate of pay",
  "Fixed allowances",
  "Fixed deductions",
  "Overtime rate of pay",
  "Leave entitlement (annual leave, sick leave, hospitalisation leave)",
  "Medical benefits",
  "Probation period",
  "Notice period",
  "Place of work",
];

async function checkKetCompleteness(
  extracted: ExtractedContract,
  ctx: EmployeeContext,
): Promise<ComplianceVerdict> {
  const clauseTitles = (extracted.clauses ?? []).map((c) =>
    c.clause_title.toLowerCase(),
  );
  const clauseTexts = (extracted.clauses ?? [])
    .map((c) => `${c.clause_title}\n${c.clause_text}`)
    .join("\n\n")
    .toLowerCase();

  const missing: string[] = [];
  const ketKeywords: Record<string, string[]> = {
    "Job title and main duties": ["job title", "duties", "responsibilities", "role"],
    "Start date of employment": ["start date", "commencement", "effective date"],
    "Working arrangements (daily working hours, number of working days per week, rest day)": ["working hours", "work hours", "working days", "rest day"],
    "Salary period and basic rate of pay": ["salary", "basic pay", "wage", "remuneration", "compensation"],
    "Fixed allowances": ["allowance", "transport", "meal", "housing"],
    "Fixed deductions": ["deduction"],
    "Overtime rate of pay": ["overtime"],
    "Leave entitlement (annual leave, sick leave, hospitalisation leave)": ["annual leave", "sick leave", "hospitalisation leave", "hospitalization leave", "medical leave"],
    "Probation period": ["probation"],
    "Notice period": ["notice period", "termination notice"],
    "Place of work": ["place of work", "work location", "office location", "workplace"],
  };

  for (const [ket, keywords] of Object.entries(ketKeywords)) {
    const found = keywords.some(
      (kw) => clauseTitles.some((t) => t.includes(kw)) || clauseTexts.includes(kw),
    );
    if (!found) missing.push(ket);
  }

  if (missing.length === 0) {
    return {
      clause_type: "Key Employment Terms (KETs) Completeness",
      contract_value: "All mandatory KETs appear to be present in the contract.",
      law_value: "Employers must provide written KETs covering 15 mandatory fields under the Employment Act.",
      verdict: "compliant",
      citation: "Employment Act s95, KETs Schedule",
      explanation: `The contract addresses all mandatory KET fields.${ctx.monthly_salary && ctx.monthly_salary > 0 ? ` Employee salary: SGD ${ctx.monthly_salary}.` : ""}`,
    };
  }

  return {
    clause_type: "Key Employment Terms (KETs) Completeness",
    contract_value: `Missing or unclear KETs: ${missing.join("; ")}`,
    law_value: "Employers must provide written KETs covering 15 mandatory fields under the Employment Act.",
    verdict: missing.length >= 3 ? "violated" : "caution",
    citation: "Employment Act s95, KETs Schedule",
    explanation: `${missing.length} mandatory KET field(s) appear missing or not clearly stated: ${missing.join(", ")}. Employers are required to provide these in writing.`,
  };
}

// ---------------------------------------------------------------------------
// Fallback: Groq direct verdict (non-agentic)
// ---------------------------------------------------------------------------

const DIRECT_VERDICT_PROMPT = `You are a compliance checker for Singapore employment law. You will be given:
1) A clause from the user's employment contract (title and full text).
2) Employee context (salary, work type, Part IV applicability).
3) Relevant excerpts from Singapore employment legislation and guidelines, each labelled with its source.

Compare the contract clause to the law/guidelines. Output exactly one JSON object (no markdown, no extra text) with:
- clause_type: the clause title provided (string)
- contract_value: a brief summary of what the contract says (string)
- law_value: what the law requires (string, or null if no relevant law found)
- verdict: one of "compliant", "caution", "violated"
- citation: section or part of the act/guideline (string or null)
- explanation: one to two sentences explaining the verdict (string)

Rules:
- Base your answer ONLY on the provided law excerpts. Do not hallucinate.
- "compliant" = meets or exceeds law, "violated" = below statutory minimum, "caution" = ambiguous or only advisory guideline applies
- If an excerpt is from a Tripartite Guideline (advisory, not binding law), use "caution" not "violated" for non-compliance.
- If a Part IV provision is involved but Part IV does not apply to the employee, the clause is "compliant" for that provision.
- Output valid JSON only.`;

async function directVerdictForClause(
  clauseTitle: string,
  clauseText: string,
  ctx: EmployeeContext,
): Promise<ComplianceVerdict> {
  const searchQuery = clauseTitle + " Singapore Employment Act Workplace Fairness Act";
  const lawChunks = await retrieveLawChunks(searchQuery);

  const lawText =
    lawChunks.length > 0
      ? lawChunks
          .map((c, i) => `[Excerpt ${i + 1} — Source: ${c.actName}]\n${c.text}`)
          .join("\n\n---\n\n")
      : "(No relevant law excerpts found.)";

  const partIV = derivePartIVApplicability(ctx);

  const userMsg = [
    "Contract clause title: " + clauseTitle,
    "Contract clause text: " + clauseText,
    "",
    "Employee context: " + partIV,
    "",
    "Relevant law/guideline excerpts:",
    lawText,
  ].join("\n");

  const client = getGroqClient();
  const response = await withRetry(() =>
    client.chat.completions.create({
      model: GROQ_FALLBACK_MODEL,
      messages: [
        { role: "system", content: DIRECT_VERDICT_PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0,
    }),
  );

  const raw = response.choices[0]?.message?.content ?? "";
  const content = extractJson(raw);

  try {
    const data = JSON.parse(content) as Record<string, unknown>;
    const v = data.verdict as string;
    return {
      clause_type: (data.clause_type as string) ?? clauseTitle,
      contract_value: (data.contract_value as string) ?? clauseText.slice(0, 200),
      law_value: (data.law_value as string) ?? null,
      verdict: (["compliant", "caution", "violated"].includes(v)
        ? v
        : "caution") as ComplianceVerdict["verdict"],
      citation: (data.citation as string) ?? null,
      explanation: (data.explanation as string) ?? null,
    };
  } catch {
    return {
      clause_type: clauseTitle,
      contract_value: clauseText.slice(0, 200),
      law_value: null,
      verdict: "caution",
      citation: null,
      explanation: "Could not parse model response.",
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runComplianceCheck(
  extracted: ExtractedContract,
  _rawText: string,
  ctx: EmployeeContext = { monthly_salary: null, work_type: null },
): Promise<ComplianceVerdict[]> {
  const allClauses = extracted.clauses ?? [];

  if (allClauses.length === 0) {
    return [
      {
        clause_type: "general",
        contract_value: "No clauses could be extracted from this contract.",
        law_value: null,
        verdict: "caution",
        citation: null,
        explanation: "The extraction did not find any clauses to check.",
      },
    ];
  }

  const maxClauses = Number(process.env.MAX_CLAUSES_PER_ANALYSIS ?? MAX_CLAUSES_DEFAULT);
  const maxClauseChars = Number(process.env.MAX_CLAUSE_CHARS ?? MAX_CLAUSE_CHARS_DEFAULT);

  const clauses = allClauses
    .filter((c) => (c.clause_title?.trim() ?? "").length > 0 || (c.clause_text?.trim() ?? "").length > 0)
    .slice(0, Number.isFinite(maxClauses) && maxClauses > 0 ? maxClauses : MAX_CLAUSES_DEFAULT)
    .map((c) => ({
      ...c,
      clause_title: c.clause_title?.slice(0, 200) ?? "",
      clause_text: (c.clause_text ?? "").slice(0, Number.isFinite(maxClauseChars) && maxClauseChars > 0 ? maxClauseChars : MAX_CLAUSE_CHARS_DEFAULT),
    }));

  // Per-run caches to reduce duplicate embedding + retrieval calls
  const embeddingCache = new Map<string, number[]>();
  const retrievalCache = new Map<string, LawChunk[]>();

  async function embedQueryCached(text: string): Promise<number[]> {
    const key = text.trim();
    const hit = embeddingCache.get(key);
    if (hit) return hit;
    const v = await embedQuery(key);
    embeddingCache.set(key, v);
    return v;
  }

  async function retrieveLawChunksCached(query: string, topK = TOP_K): Promise<LawChunk[]> {
    const cacheKey = `${topK}:${query.trim()}`;
    const hit = retrievalCache.get(cacheKey);
    if (hit) return hit;
    const index = getPineconeIndex();
    const vector = await embedQueryCached(query);
    const res = await index.namespace(NAMESPACE).query({
      vector,
      topK,
      includeMetadata: true,
    });
    const chunks = (res.matches ?? [])
      .map((m) => {
        const meta = m.metadata as Record<string, unknown> | undefined;
        return {
          text: (meta?.text as string) ?? "",
          actName: (meta?.act_name as string) ?? "Unknown",
        };
      })
      .filter((c) => c.text.length > 0);
    retrievalCache.set(cacheKey, chunks);
    return chunks;
  }

  async function executeToolCallCached(
    toolName: string,
    args: Record<string, string>,
  ): Promise<string> {
    const query = args.query ?? "";

    switch (toolName) {
      case "search_employment_act": {
        const augmented = query + " Employment Act Singapore";
        const chunks = await retrieveLawChunksCached(augmented);
        const eaChunks = chunks.filter((c) => {
          const name = c.actName.toLowerCase();
          return name.includes("employment act") || name.includes("employment claims");
        });
        return formatChunksForAgent(eaChunks.length > 0 ? eaChunks : chunks);
      }

      case "search_ket_requirements": {
        const augmented = query + " key employment terms KETs mandatory written";
        const chunks = await retrieveLawChunksCached(augmented);
        const ketChunks = chunks.filter((c) =>
          c.actName.toLowerCase().includes("ket"),
        );
        return formatChunksForAgent(ketChunks.length > 0 ? ketChunks : chunks);
      }

      case "search_guidelines": {
        const augmented = query + " tripartite guidelines workplace fairness";
        const chunks = await retrieveLawChunksCached(augmented);
        const guidelineChunks = chunks.filter((c) => {
          const name = c.actName.toLowerCase();
          return name.includes("tripartite") || name.includes("fairness") || name.includes("guideline");
        });
        return formatChunksForAgent(guidelineChunks.length > 0 ? guidelineChunks : chunks);
      }

      default:
        return "Unknown tool. Use search_employment_act, search_ket_requirements, or search_guidelines.";
    }
  }

  const [clauseVerdicts, ketVerdict] = await Promise.all([
    mapConcurrent(clauses, CONCURRENCY, async (clause) => {
      try {
        // Inline a cached variant of the agent loop to reuse retrieval/embedding results within this run.
        const client = getOpenAIClient();
        const systemPrompt = buildSystemPrompt(ctx);

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze this contract clause for compliance with Singapore law.\n\nClause title: ${clause.clause_title}\nClause text: ${clause.clause_text}`,
          },
        ];

        for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
          const isLast = iteration === MAX_AGENT_ITERATIONS - 1;

          const response = await withRetry(() =>
            client.chat.completions.create({
              model: OPENAI_MODEL,
              messages,
              tools: TOOLS,
              tool_choice: isLast
                ? { type: "function", function: { name: "submit_verdict" } }
                : "auto",
              temperature: 0,
            }),
          );

          const choice = response.choices[0];
          const assistantMessage = choice.message;
          messages.push(assistantMessage);

          if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
            const textContent = assistantMessage.content ?? "";
            const parsed = tryParseTextVerdict(textContent, clause.clause_title, clause.clause_text);
            if (parsed) return parsed;

            messages.push({
              role: "user",
              content:
                "You must call the submit_verdict tool to finalize your analysis. Do not respond with plain text.",
            });
            continue;
          }

          for (const toolCall of assistantMessage.tool_calls) {
            if (toolCall.type !== "function") continue;

            const fnName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments) as Record<string, string>;

            if (fnName === "submit_verdict") {
              return {
                clause_type: args.clause_type ?? clause.clause_title,
                contract_value: args.contract_value ?? clause.clause_text.slice(0, 200),
                law_value: args.law_value ?? null,
                verdict: (["compliant", "caution", "violated"].includes(args.verdict)
                  ? args.verdict
                  : "caution") as ComplianceVerdict["verdict"],
                citation: args.citation ?? null,
                explanation: args.explanation ?? null,
              };
            }

            const result = await executeToolCallCached(fnName, args);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            });
          }
        }

        return {
          clause_type: clause.clause_title,
          contract_value: clause.clause_text.slice(0, 200),
          law_value: null,
          verdict: "caution" as const,
          citation: null,
          explanation: "Agent did not reach a verdict within the allowed iterations.",
        };
      } catch {
        try {
          // Direct fallback still benefits from cached retrieval
          const searchQuery = clause.clause_title + " Singapore Employment Act Workplace Fairness Act";
          const lawChunks = await retrieveLawChunksCached(searchQuery);

          const lawText =
            lawChunks.length > 0
              ? lawChunks
                  .map((c, i) => `[Excerpt ${i + 1} — Source: ${c.actName}]\n${c.text}`)
                  .join("\n\n---\n\n")
              : "(No relevant law excerpts found.)";

          const partIV = derivePartIVApplicability(ctx);

          const userMsg = [
            "Contract clause title: " + clause.clause_title,
            "Contract clause text: " + clause.clause_text,
            "",
            "Employee context: " + partIV,
            "",
            "Relevant law/guideline excerpts:",
            lawText,
          ].join("\n");

          const client = getGroqClient();
          const response = await withRetry(() =>
            client.chat.completions.create({
              model: GROQ_FALLBACK_MODEL,
              messages: [
                { role: "system", content: DIRECT_VERDICT_PROMPT },
                { role: "user", content: userMsg },
              ],
              temperature: 0,
            }),
          );

          const raw = response.choices[0]?.message?.content ?? "";
          const content = extractJson(raw);

          try {
            const data = JSON.parse(content) as Record<string, unknown>;
            const v = data.verdict as string;
            return {
              clause_type: (data.clause_type as string) ?? clause.clause_title,
              contract_value: (data.contract_value as string) ?? clause.clause_text.slice(0, 200),
              law_value: (data.law_value as string) ?? null,
              verdict: (["compliant", "caution", "violated"].includes(v)
                ? v
                : "caution") as ComplianceVerdict["verdict"],
              citation: (data.citation as string) ?? null,
              explanation: (data.explanation as string) ?? null,
            };
          } catch {
            return {
              clause_type: clause.clause_title,
              contract_value: clause.clause_text.slice(0, 200),
              law_value: null,
              verdict: "caution" as const,
              citation: null,
              explanation: "Could not parse model response.",
            };
          }
        } catch {
          return {
            clause_type: clause.clause_title,
            contract_value: clause.clause_text.slice(0, 200),
            law_value: null,
            verdict: "caution" as const,
            citation: null,
            explanation: "Both primary (OpenAI) and fallback (Groq) models failed. Please retry.",
          };
        }
      }
    }),
    checkKetCompleteness(extracted, ctx),
  ]);

  return [...clauseVerdicts, ketVerdict];
}

export function complianceScore(verdicts: ComplianceVerdict[]): number {
  if (verdicts.length === 0) return 0;
  const scores: Record<string, number> = {
    compliant: 100,
    caution: 50,
    violated: 0,
  };
  const total = verdicts.reduce(
    (sum, v) => sum + (scores[v.verdict] ?? 50),
    0,
  );
  return Math.round(total / verdicts.length);
}
