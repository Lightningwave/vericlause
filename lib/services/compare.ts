import type {
  CanonicalTermComparison,
  ClauseComparison,
  ComplianceVerdict,
  ContractComparison,
  ExtractedContract,
  KeyTermComparison,
} from "@/lib/types";

function sanitize(val: string | null | undefined): string {
  if (!val) return "N/A";
  // Strip null bytes & control chars that break JSON serialization
  return val.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "").trim().slice(0, 500);
}

export function formatVerdictsForComparison(verdicts: ComplianceVerdict[]): string {
  return verdicts
    .map(
      (v) =>
        `[${sanitize(v.clause_type)}]\nVerdict: ${v.verdict}\nContract says: ${sanitize(v.contract_value)}\nLaw requires: ${sanitize(v.law_value)}\nCitation: ${sanitize(v.citation)}\nExplanation: ${sanitize(v.explanation)}`,
    )
    .join("\n\n");
}

export const COMPARE_SYSTEM_MESSAGE =
  "You are a Singapore employment law expert and career advisor. Compare two employment contracts from the employee's perspective and return valid JSON only.";

type CanonicalDef = { key: string; label: string; keywords: string[] };

const CANONICAL_TERMS: CanonicalDef[] = [
  { key: "salary", label: "Base Salary", keywords: ["salary", "pay", "remuneration", "cpf"] },
  { key: "annual_leave", label: "Annual Leave", keywords: ["annual leave", "leave entitlement"] },
  { key: "sick_leave", label: "Sick Leave", keywords: ["sick leave", "medical leave"] },
  { key: "hospitalisation_leave", label: "Hospitalisation Leave", keywords: ["hospitalisation", "hospital leave"] },
  { key: "medical_benefits", label: "Medical Benefits", keywords: ["medical", "insurance", "clinic"] },
  { key: "working_hours", label: "Working Hours", keywords: ["working hours", "work hours"] },
  { key: "overtime", label: "Overtime", keywords: ["overtime"] },
  { key: "probation", label: "Probation", keywords: ["probation"] },
  { key: "notice_period", label: "Notice Period", keywords: ["notice period", "termination notice"] },
  { key: "termination", label: "Termination", keywords: ["termination", "dismissal"] },
  { key: "non_compete", label: "Non-Compete", keywords: ["non-compete", "restrictive covenant"] },
  { key: "confidentiality_ip", label: "Confidentiality and IP", keywords: ["confidentiality", "intellectual property", "ip"] },
  { key: "retirement_age", label: "Retirement Age", keywords: ["retirement"] },
];

export function buildCompareUserPrompt(
  verdictsA: ComplianceVerdict[],
  verdictsB: ComplianceVerdict[],
  extractedA?: ExtractedContract | null,
  extractedB?: ExtractedContract | null,
): string {
  const extractedClausesA = formatExtractedClausesForComparison(extractedA);
  const extractedClausesB = formatExtractedClausesForComparison(extractedB);
  return `Compare these two employment contracts based on their legal compliance verdicts and return a JSON object.
      
      CONTRACT A - LEGAL VERDICTS:
      ${formatVerdictsForComparison(verdictsA)}
      
      ---
      
      CONTRACT B - LEGAL VERDICTS:
      ${formatVerdictsForComparison(verdictsB)}
      
      ---
      
      CONTRACT A - EXTRACTED CLAUSE LIST (ground truth for clause existence):
      ${extractedClausesA}
      
      CONTRACT B - EXTRACTED CLAUSE LIST (ground truth for clause existence):
      ${extractedClausesB}
      
      ---
      
      Analyze from the EMPLOYEE's perspective. Cover ALL of the following categories when comparing:

      COMPENSATION & PAY:
      - Base salary, bonuses, allowances, CPF contributions, overtime pay rates

      LEAVE & TIME OFF:
      - Annual leave, sick leave, hospitalisation leave, maternity/paternity leave, public holidays, compassionate leave

      WORKING CONDITIONS:
      - Working hours per week, overtime expectations, rest days, shift arrangements, remote/hybrid work

      NOTICE & TERMINATION:
      - Notice period (during and after probation), termination clauses, severance/retrenchment benefits, grounds for dismissal

      PROBATION:
      - Duration, conditions, notice during probation, benefits during probation

      BENEFITS & PERKS:
      - Medical/dental coverage, insurance (life, accident), training/education allowances, transport/meal allowances

      RESTRICTIVE CLAUSES:
      - Non-compete (duration and scope), non-solicitation, IP assignment, confidentiality scope and duration

      RETIREMENT & RETRENCHMENT:
      - Retirement age, re-employment, retrenchment benefits

      Return a JSON object with:
      1. "key_terms": array of objects { 
          "term": string, 
          "contract_a_value": string|null, 
          "contract_b_value": string|null, 
          "assessment": "a_better"|"b_better"|"equal"|"different",
          "verdict_a": "compliant"|"caution"|"violated",
          "verdict_b": "compliant"|"caution"|"violated"
         } comparing ALL terms found across compensation, leave, notice, probation, benefits, working conditions, retirement.
         Include at minimum: salary, annual leave, sick leave, notice period, probation, working hours, overtime, medical benefits, retirement age.
         Only include terms that are actually mentioned in at least one contract.

      2. "clauses": array of objects { 
          "clause_topic": string, 
          "contract_a_value": string|null, 
          "contract_b_value": string|null, 
          "assessment": "a_better"|"b_better"|"equal"|"different", 
          "explanation": string,
          "verdict_a": "compliant"|"caution"|"violated",
          "verdict_b": "compliant"|"caution"|"violated"
         } comparing each clause topic found in either contract.
         MUST include restrictive clauses (non-compete, IP, confidentiality) if present.
         Use the "verdict" and "explanation" from the legal analysis to inform your assessment. If one is "violated" and the other is "compliant", the compliant one is significantly better.

      3. "summary": a brief 2-3 sentence overall comparison.

      4. "recommendation": a 3-4 sentence actionable recommendation for the employee. Clearly state which contract is more favorable overall and why. Include specific negotiation tips (e.g., "Negotiate Contract B's non-compete down from 24 to 12 months" or "Ask Company A to match Contract B's 18 days annual leave"). If one contract has red flags, warn the employee.

      5. "canonical_terms": array with EXACT keys below (include all keys, use null if missing):
         ["salary","annual_leave","sick_leave","hospitalisation_leave","medical_benefits","working_hours","overtime","probation","notice_period","termination","non_compete","confidentiality_ip","retirement_age"]
         Each item:
         {
           "key": string,
           "label": string,
           "contract_a_value": string|null,
           "contract_b_value": string|null,
           "assessment": "a_better"|"b_better"|"equal"|"different",
           "verdict_a": "compliant"|"caution"|"violated"|null,
           "verdict_b": "compliant"|"caution"|"violated"|null
         }
      
      Assess from the employee's perspective — "a_better" means Contract A is more favorable for the employee.`;
}

const VALID_ASSESSMENTS = new Set(["a_better", "b_better", "equal", "different"]);
const VALID_VERDICTS = new Set(["compliant", "caution", "violated"]);

function normalizeAssessment(value: unknown): "a_better" | "b_better" | "equal" | "different" {
  if (typeof value === "string" && VALID_ASSESSMENTS.has(value)) {
    return value as "a_better" | "b_better" | "equal" | "different";
  }
  return "different";
}

function normalizeVerdict(value: unknown): "compliant" | "caution" | "violated" | undefined {
  if (typeof value === "string" && VALID_VERDICTS.has(value)) {
    return value as "compliant" | "caution" | "violated";
  }
  return undefined;
}

function toCanonicalTopic(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase().replace(/&/g, "and").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");
  if (!raw || raw === "n/a") return "other_terms";

  const t = raw;
  if (t.includes("position") || t.includes("duty") || t.includes("duties") || t.includes("role") || t.includes("scope") || t.includes("responsibilities") || t.includes("job title")) {
    return "position_and_duties";
  }
  if (t.includes("probation") || t.includes("commencement") || t.includes("start date") || t.includes("confirmation")) {
    return "probation_and_commencement";
  }
  if (t.includes("salary") || t.includes("remuneration") || (t.includes("pay") && !t.includes("overtime")) || t.includes("cpf") || t.includes("allowance")) {
    return "salary_and_benefits";
  }
  if (t.includes("working hours") || t.includes("work hours") || t.includes("working arrangements") || t.includes("hybrid") || t.includes("remote") || t.includes("working conditions") || t.includes("work location") || t.includes("place of work") || t.includes("workplace")) {
    return "working_conditions";
  }
  if (t.includes("leave") || t.includes("sick") || t.includes("hospitalisation") || t.includes("medical")) {
    return "leave_and_medical";
  }
  if (t.includes("termination") || t.includes("notice") || t.includes("dismissal") || t.includes("resignation")) {
    return "termination_and_notice";
  }
  if (t.includes("confidentiality") || t.includes("disclosure") || t.includes("nda") || t.includes("intellectual property") || t.includes("ip") || t.includes("data protection") || t.includes("privacy")) {
    return "confidentiality_and_ip";
  }
  if (t.includes("non compete") || t.includes("restrictive") || t.includes("non compete") || t.includes("solicitation")) {
    return "restrictive_clauses";
  }
  if (t.includes("governing law") || t.includes("dispute") || t.includes("jurisdiction") || t.includes("mediation") || t.includes("arbitration") || t.includes("miscellaneous") || t.includes("provisions") || t.includes("acknowledgement")) {
    return "governance_and_disputes";
  }
  if (t.includes("key employment terms") || t.includes("ket")) {
    return "kets_completeness";
  }
  if (t.includes("entire agreement") || t.includes("variation") || t.includes("amendment") || t.includes("governance") || t.includes("policies")) {
    return "governance_and_disputes";
  }

  return raw.replace(/[_-]+/g, " ").replace(/\s+/g, "_");
}

function topicFromCanonicalKey(key: string): string {
  const mapping: Record<string, string> = {
    position_and_duties: "Position & Duties",
    probation_and_commencement: "Probation & Commencement",
    salary_and_benefits: "Salary & Benefits",
    working_conditions: "Working Conditions",
    leave_and_medical: "Leave & Medical Benefits", // Grouping these for consistency
    termination_and_notice: "Termination & Notice",
    confidentiality_and_ip: "Confidentiality & IP",
    restrictive_clauses: "Restrictive Clauses",
    governance_and_disputes: "Governance & Dispute Resolution",
    kets_completeness: "Key Employment Terms (KETs)",
  };
  if (mapping[key]) return mapping[key];
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function topicFromClauseType(value: string | null | undefined): string {
  return topicFromCanonicalKey(toCanonicalTopic(value));
}

function topicFromClauseTitle(value: string | null | undefined): string {
  const raw = sanitize(value ?? "");
  if (!raw || raw === "N/A") return "Other terms";
  return raw;
}

function formatExtractedClausesForComparison(extracted?: ExtractedContract | null): string {
  if (!extracted?.clauses?.length) return "No extracted clauses available.";
  return extracted.clauses
    .map((c) => `- ${sanitize(c.clause_title)}: ${sanitize(c.clause_text)}`)
    .join("\n");
}

function parseModelClause(raw: any): ClauseComparison | null {
  if (!raw || typeof raw !== "object") return null;
  const topic = sanitize(typeof raw.clause_topic === "string" ? raw.clause_topic : "");
  if (!topic) return null;
  const aVal = sanitize(typeof raw.contract_a_value === "string" ? raw.contract_a_value : "N/A");
  const bVal = sanitize(typeof raw.contract_b_value === "string" ? raw.contract_b_value : "N/A");
  const explanation = sanitize(
    typeof raw.explanation === "string" ? raw.explanation : "Compared from available extracted contract values.",
  );
  return {
    clause_topic: topic,
    contract_a_value: aVal === "N/A" ? null : aVal,
    contract_b_value: bVal === "N/A" ? null : bVal,
    assessment: normalizeAssessment(raw.assessment),
    explanation,
    verdict_a: normalizeVerdict(raw.verdict_a),
    verdict_b: normalizeVerdict(raw.verdict_b),
  };
}

function parseModelKeyTerm(raw: any): KeyTermComparison | null {
  if (!raw || typeof raw !== "object") return null;
  const term = sanitize(typeof raw.term === "string" ? raw.term : "");
  if (!term) return null;
  const aVal = sanitize(typeof raw.contract_a_value === "string" ? raw.contract_a_value : "N/A");
  const bVal = sanitize(typeof raw.contract_b_value === "string" ? raw.contract_b_value : "N/A");
  return {
    term,
    contract_a_value: aVal === "N/A" ? null : aVal,
    contract_b_value: bVal === "N/A" ? null : bVal,
    assessment: normalizeAssessment(raw.assessment),
    verdict_a: normalizeVerdict(raw.verdict_a),
    verdict_b: normalizeVerdict(raw.verdict_b),
  };
}

function canonicalByKey(key: string): CanonicalDef | undefined {
  return CANONICAL_TERMS.find((d) => d.key === key);
}

function parseModelCanonicalTerm(raw: any): CanonicalTermComparison | null {
  if (!raw || typeof raw !== "object") return null;
  const key = typeof raw.key === "string" ? raw.key.trim() : "";
  const def = canonicalByKey(key);
  if (!def) return null;
  const aVal = sanitize(typeof raw.contract_a_value === "string" ? raw.contract_a_value : "N/A");
  const bVal = sanitize(typeof raw.contract_b_value === "string" ? raw.contract_b_value : "N/A");
  return {
    key: def.key,
    label: typeof raw.label === "string" && raw.label.trim() ? sanitize(raw.label) : def.label,
    contract_a_value: aVal === "N/A" ? null : aVal,
    contract_b_value: bVal === "N/A" ? null : bVal,
    assessment: normalizeAssessment(raw.assessment),
    verdict_a: normalizeVerdict(raw.verdict_a),
    verdict_b: normalizeVerdict(raw.verdict_b),
  };
}

function termKeywords(term: string): string[] {
  const t = term.toLowerCase();
  if (t.includes("medical") || t.includes("hospital")) return ["medical", "hospital", "sick", "clinic", "insurance"];
  if (t.includes("sick")) return ["sick", "medical", "hospital"];
  if (t.includes("leave")) return ["leave", "annual", "sick", "hospital"];
  if (t.includes("notice")) return ["notice", "terminate", "termination"];
  if (t.includes("probation")) return ["probation"];
  if (t.includes("working")) return ["working", "hours", "overtime"];
  if (t.includes("salary") || t.includes("remuneration") || t.includes("pay")) return ["salary", "pay", "remuneration", "cpf", "bonus"];
  return t.split(/\s+/).filter(Boolean);
}

function looksLikeMatch(haystack: string, keywords: string[]): boolean {
  const lower = haystack.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function inferKeyTermValue(
  term: string,
  extracted: ExtractedContract | null | undefined,
  verdicts: ComplianceVerdict[],
): string | null {
  const keys = termKeywords(term);

  for (const v of verdicts) {
    const source = `${v.clause_type ?? ""} ${v.contract_value ?? ""}`;
    if (looksLikeMatch(source, keys)) {
      const val = sanitize(v.contract_value);
      if (val !== "N/A") return val;
    }
  }

  for (const c of extracted?.clauses ?? []) {
    const source = `${c.clause_title ?? ""} ${c.clause_text ?? ""}`;
    if (looksLikeMatch(source, keys)) {
      const val = sanitize(c.clause_text);
      if (val !== "N/A") return val;
    }
  }

  return null;
}

function inferValueByKeywords(
  keywords: string[],
  extracted: ExtractedContract | null | undefined,
  verdicts: ComplianceVerdict[],
): { value: string | null; verdict?: "compliant" | "caution" | "violated" } {
  for (const v of verdicts) {
    const source = `${v.clause_type ?? ""} ${v.contract_value ?? ""}`;
    if (looksLikeMatch(source, keywords)) {
      const val = sanitize(v.contract_value);
      if (val !== "N/A") return { value: val, verdict: v.verdict };
    }
  }
  for (const c of extracted?.clauses ?? []) {
    const source = `${c.clause_title ?? ""} ${c.clause_text ?? ""}`;
    if (looksLikeMatch(source, keywords)) {
      const val = sanitize(c.clause_text);
      if (val !== "N/A") return { value: val };
    }
  }
  return { value: null };
}

function withKeyTermFallbacks(
  modelTerms: KeyTermComparison[],
  extractedA: ExtractedContract | null | undefined,
  extractedB: ExtractedContract | null | undefined,
  verdictsA: ComplianceVerdict[],
  verdictsB: ComplianceVerdict[],
): KeyTermComparison[] {
  return modelTerms.map((row) => {
    const aValue = row.contract_a_value ?? inferKeyTermValue(row.term, extractedA, verdictsA);
    const bValue = row.contract_b_value ?? inferKeyTermValue(row.term, extractedB, verdictsB);
    return {
      ...row,
      contract_a_value: aValue,
      contract_b_value: bValue,
    };
  });
}

function buildCanonicalTerms(
  modelCanonical: CanonicalTermComparison[],
  extractedA: ExtractedContract | null | undefined,
  extractedB: ExtractedContract | null | undefined,
  verdictsA: ComplianceVerdict[],
  verdictsB: ComplianceVerdict[],
): CanonicalTermComparison[] {
  const byKey = new Map(modelCanonical.map((item) => [item.key, item]));

  return CANONICAL_TERMS.map((def) => {
    const existing = byKey.get(def.key);
    const inferredA = inferValueByKeywords(def.keywords, extractedA, verdictsA);
    const inferredB = inferValueByKeywords(def.keywords, extractedB, verdictsB);
    const aValue = existing?.contract_a_value ?? inferredA.value;
    const bValue = existing?.contract_b_value ?? inferredB.value;
    const assessment =
      existing?.assessment ??
      (aValue && bValue ? (aValue === bValue ? "equal" : "different") : "different");

    return {
      key: def.key,
      label: existing?.label ?? def.label,
      contract_a_value: aValue,
      contract_b_value: bValue,
      assessment,
      verdict_a: existing?.verdict_a ?? inferredA.verdict,
      verdict_b: existing?.verdict_b ?? inferredB.verdict,
    };
  });
}

function buildClauseFallbacks(verdictsA: ComplianceVerdict[], verdictsB: ComplianceVerdict[]): ClauseComparison[] {
  const aByTopic = new Map<string, ComplianceVerdict>();
  const bByTopic = new Map<string, ComplianceVerdict>();

  for (const v of verdictsA) {
    const key = toCanonicalTopic(v.clause_type);
    if (!aByTopic.has(key)) aByTopic.set(key, v);
  }
  for (const v of verdictsB) {
    const key = toCanonicalTopic(v.clause_type);
    if (!bByTopic.has(key)) bByTopic.set(key, v);
  }

  const allTopics = new Set<string>([...aByTopic.keys(), ...bByTopic.keys()]);
  const rows: ClauseComparison[] = [];

  for (const topicKey of allTopics) {
    if (topicKey === "other_terms") continue;
    const a = aByTopic.get(topicKey);
    const b = bByTopic.get(topicKey);
    const aValue = sanitize(a?.contract_value ?? "N/A");
    const bValue = sanitize(b?.contract_value ?? "N/A");
    const hasA = aValue !== "N/A";
    const hasB = bValue !== "N/A";
    const assessment =
      hasA && hasB ? (aValue === bValue ? "equal" : "different") : "different";
    rows.push({
      clause_topic: topicFromCanonicalKey(topicKey),
      contract_a_value: hasA ? aValue : null,
      contract_b_value: hasB ? bValue : null,
      assessment,
      explanation: hasA && hasB ? "Both contracts mention this topic." : "Only one contract clearly specifies this topic.",
      verdict_a: a?.verdict,
      verdict_b: b?.verdict,
    });
  }

  return rows;
}

function buildExtractedClauseFallbacks(
  extractedA?: ExtractedContract | null,
  extractedB?: ExtractedContract | null,
): ClauseComparison[] {
  const aByTopic = new Map<string, string>();
  const bByTopic = new Map<string, string>();

  for (const c of extractedA?.clauses ?? []) {
    const key = toCanonicalTopic(c.clause_title);
    const text = sanitize(c.clause_text);
    if (key !== "other_terms" && text !== "N/A" && !aByTopic.has(key)) aByTopic.set(key, text);
  }
  for (const c of extractedB?.clauses ?? []) {
    const key = toCanonicalTopic(c.clause_title);
    const text = sanitize(c.clause_text);
    if (key !== "other_terms" && text !== "N/A" && !bByTopic.has(key)) bByTopic.set(key, text);
  }

  const allTopics = new Set<string>([...aByTopic.keys(), ...bByTopic.keys()]);
  const rows: ClauseComparison[] = [];

  for (const key of allTopics) {
    const aValue = aByTopic.get(key) ?? null;
    const bValue = bByTopic.get(key) ?? null;
    rows.push({
      clause_topic: topicFromCanonicalKey(key),
      contract_a_value: aValue,
      contract_b_value: bValue,
      assessment: aValue && bValue ? "different" : "different",
      explanation: aValue && bValue ? "Both contracts include this topic in their structure." : "This topic appears in only one contract's structured clauses.",
    });
  }

  return rows;
}

/**
 * Ensures comparison payload has broad clause coverage even when model output is short.
 */
export function buildNormalizedComparison(
  args: {
    document_a_id: string;
    document_b_id: string;
    parsed: any;
    verdictsA: ComplianceVerdict[];
    verdictsB: ComplianceVerdict[];
    extractedA?: ExtractedContract | null;
    extractedB?: ExtractedContract | null;
  },
): ContractComparison {
  const { document_a_id, document_b_id, parsed, verdictsA, verdictsB, extractedA, extractedB } = args;

  const rawModelTerms = Array.isArray(parsed?.key_terms)
    ? parsed.key_terms
      .map(parseModelKeyTerm)
      .filter((item: KeyTermComparison | null): item is KeyTermComparison => !!item)
    : [];
  const modelTerms = withKeyTermFallbacks(rawModelTerms, extractedA, extractedB, verdictsA, verdictsB);
  const rawCanonical = Array.isArray(parsed?.canonical_terms)
    ? parsed.canonical_terms
      .map(parseModelCanonicalTerm)
      .filter((item: CanonicalTermComparison | null): item is CanonicalTermComparison => !!item)
    : [];
  const canonicalTerms = buildCanonicalTerms(rawCanonical, extractedA, extractedB, verdictsA, verdictsB);
  const modelClauses = Array.isArray(parsed?.clauses)
    ? parsed.clauses
      .map(parseModelClause)
      .filter((item: ClauseComparison | null): item is ClauseComparison => !!item)
    : [];

  const clauseByTopic = new Map<string, ClauseComparison>();

  function mergeClause(clause: ClauseComparison) {
    const key = toCanonicalTopic(clause.clause_topic);
    const existing = clauseByTopic.get(key);

    if (!existing) {
      clauseByTopic.set(key, { ...clause, clause_topic: topicFromCanonicalKey(key) });
      return;
    }

    // Merge logic: prioritize non-null values
    existing.contract_a_value = existing.contract_a_value ?? clause.contract_a_value;
    existing.contract_b_value = existing.contract_b_value ?? clause.contract_b_value;
    existing.verdict_a = existing.verdict_a ?? clause.verdict_a;
    existing.verdict_b = existing.verdict_b ?? clause.verdict_b;

    // Update assessment if we just filled a gap
    if (existing.contract_a_value && existing.contract_b_value) {
      existing.assessment = existing.contract_a_value === existing.contract_b_value ? "equal" : "different";
    }
  }

  for (const clause of modelClauses) mergeClause(clause);
  for (const clause of buildClauseFallbacks(verdictsA, verdictsB)) mergeClause(clause);
  for (const clause of buildExtractedClauseFallbacks(extractedA, extractedB)) mergeClause(clause);

  return {
    document_a_id,
    document_b_id,
    key_terms: modelTerms,
    canonical_terms: canonicalTerms,
    clauses: Array.from(clauseByTopic.values()),
    summary: sanitize(typeof parsed?.summary === "string" ? parsed.summary : ""),
    recommendation: sanitize(typeof parsed?.recommendation === "string" ? parsed.recommendation : "") || undefined,
  };
}
