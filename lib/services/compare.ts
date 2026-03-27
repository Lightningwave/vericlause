import type { ComplianceVerdict } from "@/lib/types";

export function formatVerdictsForComparison(verdicts: ComplianceVerdict[]): string {
  return verdicts
    .map(
      (v) =>
        `[${v.clause_type}]\nVerdict: ${v.verdict}\nContract says: ${v.contract_value}\nLaw requires: ${v.law_value}\nCitation: ${v.citation}\nExplanation: ${v.explanation}`,
    )
    .join("\n\n");
}

export const COMPARE_SYSTEM_MESSAGE =
  "You are a Singapore employment law expert. Compare two employment contracts based on their legal analysis. Return valid JSON only.";

export function buildCompareUserPrompt(
  verdictsA: ComplianceVerdict[],
  verdictsB: ComplianceVerdict[],
): string {
  return `Compare these two employment contracts based on their legal compliance verdicts and return a JSON object.
      
      CONTRACT A - LEGAL VERDICTS:
      ${formatVerdictsForComparison(verdictsA)}
      
      ---
      
      CONTRACT B - LEGAL VERDICTS:
      ${formatVerdictsForComparison(verdictsB)}
      
      ---
      
      Return a JSON object with:
      1. "key_terms": array of objects { 
          "term": string, 
          "contract_a_value": string|null, 
          "contract_b_value": string|null, 
          "assessment": "a_better"|"b_better"|"equal"|"different",
          "verdict_a": "compliant"|"caution"|"violated",
          "verdict_b": "compliant"|"caution"|"violated"
         } comparing salary, leave, notice, probation, retirement age.
      2. "clauses": array of objects { 
          "clause_topic": string, 
          "contract_a_value": string|null, 
          "contract_b_value": string|null, 
          "assessment": "a_better"|"b_better"|"equal"|"different", 
          "explanation": string,
          "verdict_a": "compliant"|"caution"|"violated",
          "verdict_b": "compliant"|"caution"|"violated"
         } comparing each clause topic found in either contract. 
         Use the "verdict" and "explanation" from the legal analysis to inform your assessment. If one is "violated" and the other is "compliant", the compliant one is significantly better.
      3. "summary": a brief 2-3 sentence overall comparison.
      
      Assess from the employee's perspective — "a_better" means Contract A is more favorable for the employee.`;
}
