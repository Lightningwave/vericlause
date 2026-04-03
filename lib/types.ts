export interface EmployeeContext {
  monthly_salary: number | null;
  work_type: "office" | "manual" | null;
}

export interface ClauseLocation {
  page_number: number;
  /** Page size from the same parse as b_box (needed to map boxes to the live PDF). */
  page_width?: number;
  page_height?: number;
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
// Resume onboarding
// ---------------------------------------------------------------------------

export interface ResumeSuggestion {
  type:
  | "critical_fix"
  | "enhancement"
  | "design_feedback"
  | "content_gap"
  | "impact_opportunity"
  | "ats_optimization";
  priority: "high" | "medium" | "low";
  category: "formatting" | "content" | "structure" | "keywords" | "impact";
  suggestion: string;
  original_text?: string;
  suggested_rewrite?: string;
  rationale?: string;
  implementation_effort?: "quick" | "moderate" | "significant";
}

export interface ResumeProfile {
  headline: string | null;
  summary: string | null;
  skills: string[];
  years_experience: number | null;
  experiences: {
    title: string | null;
    company: string | null;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
  }[];
  education: {
    institution: string | null;
    qualification: string | null;
    field_of_study: string | null;
    graduation_year: number | null;
  }[];
  target_roles: string[];
  target_industries: string[];
  location_preference: string | null;
  seniority_level: "junior" | "mid" | "senior" | "lead" | "executive" | null;
}

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

export type TranslationLanguage = "zh" | "ta" | "ms";

// ---------------------------------------------------------------------------
// Contract Comparison
// ---------------------------------------------------------------------------

export interface ClauseComparison {
  clause_topic: string;
  contract_a_value: string | null;
  contract_b_value: string | null;
  assessment: "a_better" | "b_better" | "equal" | "different";
  explanation: string;
  verdict_a?: "compliant" | "caution" | "violated";
  verdict_b?: "compliant" | "caution" | "violated";
}

export interface KeyTermComparison {
  term: string;
  contract_a_value: string | null;
  contract_b_value: string | null;
  assessment: "a_better" | "b_better" | "equal" | "different";
  verdict_a?: "compliant" | "caution" | "violated";
  verdict_b?: "compliant" | "caution" | "violated";
}

export interface CanonicalTermComparison {
  key: string;
  label: string;
  contract_a_value: string | null;
  contract_b_value: string | null;
  assessment: "a_better" | "b_better" | "equal" | "different";
  verdict_a?: "compliant" | "caution" | "violated";
  verdict_b?: "compliant" | "caution" | "violated";
}

export interface ContractComparison {
  document_a_id: string;
  document_b_id: string;
  key_terms: KeyTermComparison[];
  canonical_terms?: CanonicalTermComparison[];
  clauses: ClauseComparison[];
  summary: string;
  recommendation?: string;
}

// ---------------------------------------------------------------------------
// Interview scoring
// ---------------------------------------------------------------------------

export interface InterviewTranscriptLine {
  role: "user" | "agent";
  text: string;
}

export interface InterviewScoreDimension {
  key:
  | "clarity_communication"
  | "role_relevance"
  | "technical_or_leadership_depth"
  | "problem_solving_examples"
  | "structure_conciseness"
  | "confidence_presence";
  label: string;
  score: number; // 0-10
  reason: string;
}

export interface InterviewScoreResult {
  overall_score: number; // 0-100
  dimensions: InterviewScoreDimension[];
  strengths: string[];
  improvements: string[];
  evidence_quotes: string[];
  summary: string;
  confidence?: "low" | "medium" | "high";
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

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export type ComparisonJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface ComparisonJobRow {
  id: string;
  user_id: string;
  document_a_id: string;
  document_b_id: string;
  status: ComparisonJobStatus;
  error: string | null;
  result: ContractComparison | null;
  created_at: string;
  updated_at: string;
}
