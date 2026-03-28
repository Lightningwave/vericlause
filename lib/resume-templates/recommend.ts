import type { ResumeTemplateData, TemplateId } from "./types";

const TEMPLATE_IDS: TemplateId[] = [
  "munich",
  "traditional",
  "executive",
  "modern-minimal",
  "navy-executive",
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function recommendTemplate(data: ResumeTemplateData): TemplateId {
  const scores: Record<TemplateId, number> = {
    munich: 0,
    traditional: 0,
    executive: 0,
    "modern-minimal": 0,
    "navy-executive": 0,
  };

  // ── Criterion 1: Content density ─────────────────────────────────────────
  const allText = [
    data.summary ?? "",
    data.experiences.map((e) => `${e.title} ${e.company} ${e.description}`).join(" "),
    data.skills.map((s) => s.name).join(" "),
    data.educations.map((e) => `${e.institution} ${e.qualification}`).join(" "),
  ].join(" ");

  const totalWords = wordCount(allText);

  if (totalWords > 400) {
    scores["executive"] += 3;
    scores["modern-minimal"] += 2;
  } else if (totalWords < 200) {
    scores["navy-executive"] += 3;
    scores["munich"] += 2;
  } else {
    scores["munich"] += 1;
    scores["navy-executive"] += 1;
  }

  // ── Criterion 2: Industry signal ─────────────────────────────────────────
  const industryText = [
    data.summary ?? "",
    data.experiences.map((e) => `${e.title} ${e.description}`).join(" "),
    data.jobTitle ?? "",
  ].join(" ");

  if (
    hasKeyword(industryText, [
      "finance", "financial", "banking", "legal", "law", "compliance",
      "consulting", "accountant", "accounting", "audit",
    ])
  ) {
    scores["munich"] += 3;
    scores["executive"] += 2;
  }

  if (
    hasKeyword(industryText, [
      "software", "engineer", "developer", "tech", "technology",
      "data", "analytics", "machine learning", "devops", "cloud",
    ])
  ) {
    scores["modern-minimal"] += 3;
  }

  if (
    hasKeyword(industryText, [
      "creative", "marketing", "design", "branding", "media",
      "communications", "advertising", "art director",
    ])
  ) {
    scores["navy-executive"] += 3;
  }

  // ── Criterion 3: Career level signal ─────────────────────────────────────
  const hasMultipleRoles = data.experiences.length > 2;
  const seniorSignals = hasKeyword(
    data.summary ?? "",
    ["10 years", "15 years", "20 years", "decade", "senior", "head of", "director", "vp", "cxo", "c-suite"],
  );
  const freshGradSignals =
    data.experiences.length <= 1 ||
    hasKeyword(data.summary ?? "", ["fresh graduate", "entry level", "recent graduate", "intern"]);

  if (hasMultipleRoles || seniorSignals) {
    scores["executive"] += 2;
    scores["navy-executive"] += 2;
  }

  if (freshGradSignals) {
    scores["traditional"] += 2;
    scores["munich"] += 1;
  }

  // ── Criterion 4: Photo availability ──────────────────────────────────────
  if (data.photoUrl) {
    scores["traditional"] += 3;
  } else {
    scores["traditional"] -= 3; // Remove from strong consideration
  }

  // ── Criterion 5: Content completeness ────────────────────────────────────
  const populatedSections = [
    data.summary,
    data.experiences.length > 0,
    data.skills.length > 0,
    data.educations.length > 0,
  ].filter(Boolean).length;

  if (populatedSections === 4) {
    scores["munich"] += 2;
    scores["navy-executive"] += 2;
  } else if (populatedSections <= 2) {
    scores["executive"] += 1;
    scores["modern-minimal"] += 1;
  }

  // ── Pick highest-scoring template ────────────────────────────────────────
  let best: TemplateId = "munich";
  let bestScore = -Infinity;
  for (const id of TEMPLATE_IDS) {
    if (scores[id] > bestScore) {
      bestScore = scores[id];
      best = id;
    }
  }

  return best;
}
