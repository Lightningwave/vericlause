export type PlanKey = "free" | "pro" | "business";

export type PlanLimits = {
  fullContractAnalysesLifetime?: number | null;
  fullContractAnalysesPerMonth?: number | null;
  fullResumeReviewsPerWeek?: number | null;
  fullResumeReviewsPerMonth?: number | null;
};

export type PlanFeatures = {
  contractComparison: boolean;
  verdictTranslation: boolean;
  resumeImprove: boolean;
  voiceResume: boolean;
  interviewPractice: boolean;
  prioritySupport: boolean;
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
      fullResumeReviewsPerWeek: 2,
    },
    features: {
      contractComparison: false,
      verdictTranslation: false,
      resumeImprove: false,
      voiceResume: false,
      interviewPractice: false,
      prioritySupport: false,
      seats: 1,
      billingMode: "none",
    },
  },

  pro: {
    key: "pro",
    displayName: "Pro",
    limits: {
      fullContractAnalysesPerMonth: 10,
      fullResumeReviewsPerMonth: 20,
    },
    features: {
      contractComparison: true,
      verdictTranslation: true,
      resumeImprove: true,
      voiceResume: true,
      interviewPractice: true,
      prioritySupport: true,
      seats: 1,
      billingMode: "stripe",
    },
  },

  business: {
    key: "business",
    displayName: "Business",
    limits: {
      fullContractAnalysesPerMonth: null,
      fullResumeReviewsPerMonth: null,
    },
    features: {
      contractComparison: true,
      verdictTranslation: true,
      resumeImprove: true,
      voiceResume: true,
      interviewPractice: true,
      prioritySupport: true,
      seats: "custom",
      billingMode: "manual",
    },
  },
};