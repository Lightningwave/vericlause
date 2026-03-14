export interface EmployeeContext {
  monthly_salary: number | null;
  work_type: "office" | "manual" | null;
}

export interface ClauseLocation {
  page_number: number;
  b_box?: [number, number, number, number];
}

export interface ContractClause {
  clause_title: string;
  clause_text: string;
  source_anchor_text?: string;
  locations?: ClauseLocation[];
}

export interface ExtractedContract {
  salary: number | null;
  job_title: string | null;
  notice_period_days: number | null;
  notice_period_weeks: number | null;
  notice_period_months: number | null;
  annual_leave_days: number | null;
  probation_months: number | null;
  retirement_age: number | null;
  clauses: ContractClause[];
}

export interface ComplianceVerdict {
  clause_type: string;
  contract_value: string | null;
  law_value: string | null;
  verdict: "compliant" | "caution" | "violated";
  citation: string | null;
  explanation: string | null;
  translated_contract_value?: string | null;
  translated_law_value?: string | null;
  translated_explanation?: string | null;
}

export interface ComplianceReport {
  document_id: string;
  extracted: ExtractedContract;
  verdicts: ComplianceVerdict[];
  compliance_score: number;
}

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

export type TranslationLanguage = "zh" | "ta";

// ---------------------------------------------------------------------------
// Contract Comparison
// ---------------------------------------------------------------------------

export interface ClauseComparison {
  clause_topic: string;
  contract_a_value: string | null;
  contract_b_value: string | null;
  assessment: "a_better" | "b_better" | "equal" | "different";
  explanation: string;
}

export interface KeyTermComparison {
  term: string;
  contract_a_value: string | null;
  contract_b_value: string | null;
  assessment: "a_better" | "b_better" | "equal" | "different";
}

export interface ContractComparison {
  document_a_id: string;
  document_b_id: string;
  key_terms: KeyTermComparison[];
  clauses: ClauseComparison[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Market Benchmark
// ---------------------------------------------------------------------------

export interface BenchmarkItem {
  term: string;
  contract_value: string | null;
  market_range: string;
  assessment: "above" | "at" | "below";
  explanation: string;
}

export interface BenchmarkResult {
  job_title: string;
  items: BenchmarkItem[];
  overall_summary: string;
}
