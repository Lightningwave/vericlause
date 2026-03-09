export interface ExtractedContract {
  salary: number | null;
  job_title: string | null;
  notice_period_days: number | null;
  notice_period_weeks: number | null;
  notice_period_months: number | null;
  annual_leave_days: number | null;
  probation_months: number | null;
  retirement_age: number | null;
}

export interface ComplianceVerdict {
  clause_type: string;
  contract_value: string | null;
  law_value: string | null;
  verdict: "compliant" | "caution" | "violated";
  citation: string | null;
  explanation: string | null;
}

export interface ComplianceReport {
  document_id: string;
  extracted: ExtractedContract;
  verdicts: ComplianceVerdict[];
  compliance_score: number;
}
