export type PlanKey = "free" | "pro" | "business";

export type PlanLimits = {
  fullContractAnalysesLifetime?: number | null;
  fullContractAnalysesPerMonth?: number | null;
  resumeReviewsPerWeek?: number | null;
  resumeReviewsPerMonth?: number | null;
};

export type PlanFeatures = {
  contractComparison: boolean;
  verdictTranslation: boolean;
  resumeImprove: boolean;
  voiceResume: boolean;
  interviewPractice: boolean;
  prioritySupport: boolean;
  exportReports: boolean;
  seats: number | "custom";
  billingMode: "none" | "stripe" | "manual";
};

export const PLAN_DEFINITIONS: Record<
  PlanKey,
  {
    key: PlanKey;
    displayName: string;
    limits: PlanLimits;
    features: PlanFeatures;
  }
> = {
  free: {
    key: "free",
    displayName: "Free",
    limits: {
      fullContractAnalysesLifetime: 1,
      resumeReviewsPerWeek: 2,
    },
    features: {
      contractComparison: false,
      verdictTranslation: true,
      resumeImprove: false,
      voiceResume: true,
      interviewPractice: false,
      prioritySupport: false,
      exportReports: false,
      seats: 1,
      billingMode: "none",
    },
  },

  pro: {
    key: "pro",
    displayName: "Pro",
    limits: {
      fullContractAnalysesPerMonth: 10,
      resumeReviewsPerMonth: 20,
    },
    features: {
      contractComparison: true,
      verdictTranslation: true,
      resumeImprove: true,
      voiceResume: true,
      interviewPractice: true,
      prioritySupport: true,
      exportReports: true,
      seats: 1,
      billingMode: "stripe",
    },
  },

  business: {
    key: "business",
    displayName: "Business",
    limits: {
      fullContractAnalysesPerMonth: null,
      resumeReviewsPerMonth: null,
    },
    features: {
      contractComparison: true,
      verdictTranslation: true,
      // AI suggestions (Apply AI Suggestions) should be Pro-only.
      resumeImprove: false,
      voiceResume: true,
      interviewPractice: true,
      prioritySupport: true,
      exportReports: true,
      seats: "custom",
      billingMode: "manual",
    },
  },
};