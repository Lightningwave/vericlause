export type PlanKey = "free" | "pro" | "business";

export type PlanLimits = {
  fullContractAnalysesLifetime?: number | null;
  fullContractAnalysesPerMonth?: number | null;
  aiReviewsPerDay?: number | null;
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
      aiReviewsPerDay: 2,
    },
    features: {
      contractComparison: false,
      verdictTranslation: false,
      resumeImprove: false,
      voiceResume: false,
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
      aiReviewsPerDay: 10,
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
      fullContractAnalysesPerMonth: 40,
      aiReviewsPerDay: null,
    },
    features: {
      contractComparison: true,
      verdictTranslation: true,
      resumeImprove: true,
      voiceResume: true,
      interviewPractice: true,
      prioritySupport: true,
      exportReports: true,
      seats: "custom",
      billingMode: "manual",
    },
  },
};