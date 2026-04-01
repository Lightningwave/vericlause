export interface ResumeExperience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ResumeEducation {
  institution: string;
  qualification: string;
  fieldOfStudy?: string;
  graduationYear?: string;
}

export interface ResumeSkill {
  name: string;
  level: number; // 0–100
}

export interface ResumeTemplateData {
  name: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experiences: ResumeExperience[];
  educations: ResumeEducation[];
  skills: ResumeSkill[];
  extras?: { title: string; content: string }[];
  photoUrl?: string;
}

export type TemplateId =
  | "munich"
  | "traditional"
  | "executive"
  | "modern-minimal"
  | "navy-executive";

export interface TemplateOption {
  id: TemplateId;
  name: string;
  description: string;
  bestFor: string;
}

export const TEMPLATES: TemplateOption[] = [
  {
    id: "munich",
    name: "Munich",
    description: "Two-Column Classic",
    bestFor: "Finance, legal, consulting, mid-career professionals",
  },
  {
    id: "traditional",
    name: "Traditional",
    description: "Single Column with Photo",
    bestFor: "Entry-level, traditional industries, photo-expected roles",
  },
  {
    id: "executive",
    name: "Executive",
    description: "Single Column Dense",
    bestFor: "Senior executives, content-heavy, depth over design",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Left-Label Layout",
    bestFor: "Tech, engineering, ATS-heavy, minimalists",
  },
  {
    id: "navy-executive",
    name: "Navy Executive",
    description: "Dark Header, Two-Column",
    bestFor: "Executive, senior management, creative directors",
  },
];
