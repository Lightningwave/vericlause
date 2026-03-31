"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { getResumeById, listResumes } from "@/lib/api";
import type { ResumeTemplateData } from "@/lib/resume-templates/types";
import { TemplatePickerModal } from "@/components/resume/TemplatePickerModal";

type ExperienceItem = {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startMonth: number | null;
  startYear: number | null;
  endMonth: number | null;
  endYear: number | null;
  endIsPresent: boolean;
  description: string;
};

type EducationItem = {
  id: string;
  school: string;
  qualification: string;
  fieldOfStudy: string;
  startMonth: number | null;
  startYear: number | null;
  endMonth: number | null;
  endYear: number | null;
  endIsPresent: boolean;
};

type SkillItem = {
  id: string;
  name: string;
  level: number;
};

type ExtraSection = {
  id: string;
  title: string;
  content: string;
};

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS: number[] = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => CURRENT_YEAR - i);

function sanitiseName(raw: string): string {
  return raw.replace(/^[#\s]+|[#\s]+$/g, "").trim();
}

function formatDate(month: number | null, year: number | null): string {
  if (!year) return "";
  if (!month) return String(year);
  return `${MONTHS[month - 1]} ${year}`;
}

function parseDate(str: string | null | undefined): { month: number | null; year: number | null } {
  if (!str) return { month: null, year: null };
  const trimmed = str.trim();
  const mY = trimmed.match(/^([A-Za-z]{3,})\s+(\d{4})$/);
  if (mY) {
    const abbr = mY[1].slice(0, 3);
    const idx = MONTHS.findIndex((m) => m.toLowerCase() === abbr.toLowerCase());
    return { month: idx >= 0 ? idx + 1 : null, year: parseInt(mY[2]) };
  }
  const isoM = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (isoM) return { month: parseInt(isoM[2]), year: parseInt(isoM[1]) };
  const yrM = trimmed.match(/^(\d{4})$/);
  if (yrM) return { month: null, year: parseInt(yrM[1]) };
  return { month: null, year: null };
}

function calcDuration(
  sMonth: number | null, sYear: number | null,
  eMonth: number | null, eYear: number | null,
  isPresent: boolean,
): string {
  if (!sYear) return "";
  const now = new Date();
  const endY = isPresent ? now.getFullYear() : eYear;
  const endM = isPresent ? now.getMonth() + 1 : eMonth;
  if (!endY) return "";
  const totalMonths = (endY - sYear) * 12 + ((endM ?? 6) - (sMonth ?? 1));
  if (totalMonths <= 0) return "";
  const yrs = Math.floor(totalMonths / 12);
  const mos = totalMonths % 12;
  if (yrs === 0) return `${mos} mo${mos !== 1 ? "s" : ""}`;
  if (mos === 0) return `${yrs} yr${yrs !== 1 ? "s" : ""}`;
  return `${yrs} yr${yrs !== 1 ? "s" : ""} ${mos} mo${mos !== 1 ? "s" : ""}`;
}

function MonthYearPicker({
  month, year, onChange, disabled,
}: {
  month: number | null;
  year: number | null;
  onChange: (month: number | null, year: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <select
        value={month ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null, year)}
        disabled={disabled}
        className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none focus:border-navy-950 disabled:opacity-50"
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year ?? ""}
        onChange={(e) => onChange(month, e.target.value ? Number(e.target.value) : null)}
        disabled={disabled}
        className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none focus:border-navy-950 disabled:opacity-50"
      >
        <option value="">Year</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

export default function ResumeBuilderPage() {
  const { t } = useLanguage();

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const [fullName, setFullName] = useState("Your Name");
  const [targetRole, setTargetRole] = useState("Operations Executive");
  const [email, setEmail] = useState("yourname@email.com");
  const [phone, setPhone] = useState("+65 9123 4567");
  const [location, setLocation] = useState("Singapore");
  const [summary, setSummary] = useState(
    "Detail-oriented professional with experience in coordination, documentation, stakeholder communication, and operational support."
  );

  const [experiences, setExperiences] = useState<ExperienceItem[]>([
    {
      id: createId(),
      jobTitle: "Operations Coordinator",
      company: "Inter Group",
      location: "Singapore",
      startMonth: null, startYear: 2023,
      endMonth: null, endYear: null, endIsPresent: true,
      description:
        "Coordinated internal documentation, supported project follow-up, and assisted with daily workflow tracking and stakeholder communication.",
    },
  ]);

  const [educations, setEducations] = useState<EducationItem[]>([
    {
      id: createId(),
      school: "ABC Institute",
      qualification: "Diploma",
      fieldOfStudy: "Business Administration",
      startMonth: null, startYear: 2019,
      endMonth: null, endYear: 2022, endIsPresent: false,
    },
  ]);

  const [skills, setSkills] = useState<SkillItem[]>([
    { id: createId(), name: "Communication", level: 85 },
    { id: createId(), name: "Project Coordination", level: 80 },
    { id: createId(), name: "Documentation", level: 90 },
  ]);

  const [extraSections, setExtraSections] = useState<ExtraSection[]>(() => [
    {
      id: createId(),
      title: "Certifications",
      content: t("builder_optional_placeholder"),
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function prefillFromResume() {
      setPrefillLoading(true);
      try {
        // Get email from Supabase auth
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled && user?.email) {
          console.log("[ResumeBuilder] Got user email:", user.email);
          setEmail(user.email);
        }

        // Get most recent analyzed resume
        console.log("[ResumeBuilder] Fetching resumes...");
        const listed = await listResumes();
        console.log("[ResumeBuilder] Listed resumes:", listed.resumes?.length ?? 0);

        if (!listed.resumes?.length || cancelled) return;

        const withProfile = listed.resumes.find((r) => r.parsed_profile);
        const target = withProfile ?? listed.resumes[0];
        if (!target) return;

        console.log("[ResumeBuilder] Loading resume:", target.id, target.file_name);
        const data = await getResumeById(target.id);
        if (cancelled || !data?.resume) return;

        const resume = data.resume;
        const profile = resume.parsed_profile;

        console.log("[ResumeBuilder] Profile:", profile);

        // Extract name from raw_text first meaningful line
        if (resume.raw_text) {
          const firstMeaningfulLine = resume.raw_text.split("\n").find((line) => {
            const trimmed = line.trim();
            return (
              trimmed.length > 0 &&
              trimmed.length < 60 &&
              !/[@\d+()[\]]|Summary|Experience|Skills|Education|Name:|Target/i.test(trimmed)
            );
          });
          if (firstMeaningfulLine && !cancelled) {
            console.log("[ResumeBuilder] Extracted name:", firstMeaningfulLine.trim());
            setFullName(sanitiseName(firstMeaningfulLine));
          }
        }

        if (!profile || cancelled) return;

        if (profile.headline) setTargetRole(profile.headline);
        if (profile.summary) setSummary(profile.summary);

        if (profile.skills?.length) {
          setSkills(profile.skills.map((name) => ({ id: createId(), name, level: 80 })));
        }

        if (profile.experiences?.length) {
          setExperiences(
            profile.experiences.map((exp) => {
              const isPresent =
                !exp.end_date || exp.end_date.toLowerCase() === "present";
              const start = parseDate(exp.start_date);
              const end = isPresent ? { month: null, year: null } : parseDate(exp.end_date);
              return {
                id: createId(),
                jobTitle: exp.title ?? "",
                company: exp.company ?? "",
                location: "",
                startMonth: start.month,
                startYear: start.year,
                endMonth: end.month,
                endYear: end.year,
                endIsPresent: isPresent,
                description: exp.description ?? "",
              };
            }),
          );
        }

        if (profile.education?.length) {
          setEducations(
            profile.education.map((edu) => ({
              id: createId(),
              school: edu.institution ?? "",
              qualification: edu.qualification ?? "",
              fieldOfStudy: edu.field_of_study ?? "",
              startMonth: null, startYear: null,
              endMonth: null,
              endYear: edu.graduation_year ?? null,
              endIsPresent: false,
            })),
          );
        }
      } catch (err) {
        console.error("[ResumeBuilder] prefillFromResume error:", err);
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    }

    prefillFromResume();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toBase64DataUri(source: string): Promise<string> {
    const response = await fetch(source);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);

    void toBase64DataUri(objectUrl)
      .then((b64) => setPhotoBase64(b64))
      .catch(() => setPhotoBase64(null));
  }

  function updateExperience(
    id: string,
    field: keyof Omit<ExperienceItem, "id">,
    value: string | number | boolean | null,
  ) {
    setExperiences((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  async function handleCompanyBlur(id: string, company: string) {
    if (!company.trim()) return;
    const item = experiences.find((e) => e.id === id);
    if (!item || item.location.trim()) return;
    try {
      const res = await fetch(`/api/places?query=${encodeURIComponent(company + " Singapore")}`);
      if (!res.ok) return;
      const json = (await res.json()) as { place: { location: string } | null };
      if (json.place?.location) updateExperience(id, "location", json.place.location);
    } catch {
      // fail silently
    }
  }

  function addExperience() {
    setExperiences((prev) => [
      ...prev,
      {
        id: createId(),
        jobTitle: "",
        company: "",
        location: "",
        startMonth: null, startYear: null,
        endMonth: null, endYear: null, endIsPresent: false,
        description: "",
      },
    ]);
  }

  function removeExperience(id: string) {
    setExperiences((prev) => prev.filter((item) => item.id !== id));
  }

  function updateEducation(
    id: string,
    field: keyof Omit<EducationItem, "id">,
    value: string | number | boolean | null,
  ) {
    setEducations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function addEducation() {
    setEducations((prev) => [
      ...prev,
      {
        id: createId(),
        school: "",
        qualification: "",
        fieldOfStudy: "",
        startMonth: null, startYear: null,
        endMonth: null, endYear: null, endIsPresent: false,
      },
    ]);
  }

  function removeEducation(id: string) {
    setEducations((prev) => prev.filter((item) => item.id !== id));
  }

  function updateSkill(id: string, field: keyof SkillItem, value: string | number) {
    setSkills((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function addSkill() {
    setSkills((prev) => [...prev, { id: createId(), name: "", level: 70 }]);
  }

  function removeSkill(id: string) {
    setSkills((prev) => prev.filter((item) => item.id !== id));
  }

  function updateExtraSection(id: string, field: keyof ExtraSection, value: string) {
    setExtraSections((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function addExtraSection() {
    setExtraSections((prev) => [
      ...prev,
      {
        id: createId(),
        title: "",
        content: "",
      },
    ]);
  }

  function removeExtraSection(id: string) {
    setExtraSections((prev) => prev.filter((item) => item.id !== id));
  }

  const filledSkills = useMemo(
    () => skills.filter((skill) => skill.name.trim()),
    [skills],
  );

  function buildTemplateData(): ResumeTemplateData {
    return {
      name: sanitiseName(fullName),
      jobTitle: targetRole || undefined,
      email: email || undefined,
      phone: phone || undefined,
      location: location || undefined,
      summary: summary || undefined,
      experiences: experiences
        .filter((e) => e.jobTitle.trim() || e.company.trim())
        .map((e) => ({
          title: e.jobTitle,
          company: e.company,
          location: e.location || undefined,
          startDate: formatDate(e.startMonth, e.startYear),
          endDate: e.endIsPresent ? "Present" : formatDate(e.endMonth, e.endYear),
          description: e.description,
        })),
      educations: educations
        .filter((ed) => ed.school.trim() || ed.qualification.trim())
        .map((ed) => ({
          institution: ed.school,
          qualification: ed.qualification,
          fieldOfStudy: ed.fieldOfStudy || undefined,
          graduationYear: ed.endIsPresent
            ? "Present"
            : formatDate(ed.endMonth, ed.endYear) || undefined,
        })),
      skills: filledSkills.map((s) => ({ name: s.name, level: s.level })),
      extras: extraSections
        .filter((ex) => ex.title.trim() && ex.content.trim())
        .map((ex) => ({ title: ex.title, content: ex.content })),
      photoUrl: photoBase64 ?? undefined,
    };
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={<UserMenu />}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            {t("nav_resume_builder")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            {t("resume_builder_page_title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            {t("resume_builder_page_lead")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
          <section className="min-w-0 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-xl font-semibold text-navy-950">{t("resume_builder_section_basic")}</h2>

              <div className="mt-5 grid gap-6 md:grid-cols-[160px_1fr]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t("resume_builder_label_display_picture")}
                  </label>
                  <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={t("resume_builder_photo_alt")}
                        className="h-28 w-28 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
                        {t("resume_builder_no_photo")}
                      </div>
                    )}

                    <label className="mt-4 inline-flex cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                      {t("resume_builder_upload")}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t("resume_builder_label_full_name")}
                    </label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-navy-950"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t("resume_builder_label_target_role")}
                    </label>
                    <input
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-navy-950"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t("resume_builder_label_email")}
                    </label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-navy-950"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t("resume_builder_label_phone")}
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-navy-950"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t("resume_builder_label_location")}</label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-navy-950"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-xl font-semibold text-navy-950">{t("resume_builder_summary_title")}</h2>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-4 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-navy-950"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-navy-950">{t("resume_builder_section_job_experience")}</h2>
                <button
                  type="button"
                  onClick={addExperience}
                  className="rounded-lg bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t("resume_builder_add_experience")}
                </button>
              </div>

              <div className="mt-5 space-y-5">
                {experiences.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        {t("resume_builder_experience_item")} {index + 1}
                      </p>
                      {experiences.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeExperience(item.id)}
                          className="text-sm font-medium text-red-600"
                        >
                          {t("resume_builder_remove")}
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        placeholder={t("resume_builder_ph_job_title")}
                        value={item.jobTitle}
                        onChange={(e) => updateExperience(item.id, "jobTitle", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                      />
                      <input
                        placeholder={t("resume_builder_ph_company")}
                        value={item.company}
                        onChange={(e) => updateExperience(item.id, "company", e.target.value)}
                        onBlur={(e) => void handleCompanyBlur(item.id, e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                      />
                      <input
                        placeholder={t("resume_builder_ph_location")}
                        value={item.location}
                        onChange={(e) => updateExperience(item.id, "location", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                      />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500">{t("builder_start_date")}</p>
                        <MonthYearPicker
                          month={item.startMonth}
                          year={item.startYear}
                          onChange={(m, y) => {
                            updateExperience(item.id, "startMonth", m);
                            updateExperience(item.id, "startYear", y);
                          }}
                        />
                        <p className="pt-1 text-xs font-medium text-slate-500">{t("builder_end_date")}</p>
                        {!item.endIsPresent && (
                          <MonthYearPicker
                            month={item.endMonth}
                            year={item.endYear}
                            onChange={(m, y) => {
                              updateExperience(item.id, "endMonth", m);
                              updateExperience(item.id, "endYear", y);
                            }}
                          />
                        )}
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={item.endIsPresent}
                            onChange={(e) => updateExperience(item.id, "endIsPresent", e.target.checked)}
                            className="accent-navy-950"
                          />
                          {t("builder_present_only")}
                        </label>
                        {(() => {
                          const dur = calcDuration(item.startMonth, item.startYear, item.endMonth, item.endYear, item.endIsPresent);
                          return dur ? <p className="text-xs text-slate-500">{dur}</p> : null;
                        })()}
                      </div>
                      <textarea
                        placeholder={t("resume_builder_ph_experience_body")}
                        value={item.description}
                        onChange={(e) => updateExperience(item.id, "description", e.target.value)}
                        className="min-h-[140px] rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950 md:col-span-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-navy-950">{t("resume_builder_skills_title")}</h2>
                <button
                  type="button"
                  onClick={addSkill}
                  className="rounded-lg bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t("resume_builder_add_skill")}
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {skills.map((skill, index) => (
                  <div key={skill.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        {t("resume_builder_skill_item")} {index + 1}
                      </p>
                      {skills.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeSkill(skill.id)}
                          className="text-sm font-medium text-red-600"
                        >
                          {t("resume_builder_remove")}
                        </button>
                      ) : null}
                    </div>

                    <input
                      placeholder={t("resume_builder_ph_skill_name")}
                      value={skill.name}
                      onChange={(e) => updateSkill(skill.id, "name", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                    />

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                        <span>{t("resume_builder_proficiency")}</span>
                        <span>{skill.level}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={skill.level}
                        onChange={(e) => updateSkill(skill.id, "level", Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-navy-950">{t("resume_builder_education_title")}</h2>
                <button
                  type="button"
                  onClick={addEducation}
                  className="rounded-lg bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t("resume_builder_add_education")}
                </button>
              </div>

              <div className="mt-5 space-y-5">
                {educations.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        {t("resume_builder_education_item")} {index + 1}
                      </p>
                      {educations.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeEducation(item.id)}
                          className="text-sm font-medium text-red-600"
                        >
                          {t("resume_builder_remove")}
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        placeholder={t("resume_builder_ph_school")}
                        value={item.school}
                        onChange={(e) => updateEducation(item.id, "school", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                      />
                      <input
                        placeholder={t("resume_builder_ph_qualification")}
                        value={item.qualification}
                        onChange={(e) => updateEducation(item.id, "qualification", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                      />
                      <input
                        placeholder={t("resume_builder_ph_field_of_study")}
                        value={item.fieldOfStudy}
                        onChange={(e) => updateEducation(item.id, "fieldOfStudy", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                      />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500">{t("builder_start_date")}</p>
                        <MonthYearPicker
                          month={item.startMonth}
                          year={item.startYear}
                          onChange={(m, y) => {
                            updateEducation(item.id, "startMonth", m);
                            updateEducation(item.id, "startYear", y);
                          }}
                        />
                        <p className="pt-1 text-xs font-medium text-slate-500">{t("builder_end_date")}</p>
                        {!item.endIsPresent && (
                          <MonthYearPicker
                            month={item.endMonth}
                            year={item.endYear}
                            onChange={(m, y) => {
                              updateEducation(item.id, "endMonth", m);
                              updateEducation(item.id, "endYear", y);
                            }}
                          />
                        )}
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={item.endIsPresent}
                            onChange={(e) => updateEducation(item.id, "endIsPresent", e.target.checked)}
                            className="accent-navy-950"
                          />
                          {t("builder_present")}
                        </label>
                        {(() => {
                          const dur = calcDuration(item.startMonth, item.startYear, item.endMonth, item.endYear, item.endIsPresent);
                          return dur ? <p className="text-xs text-slate-500">{dur}</p> : null;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-navy-950">{t("resume_builder_optional_sections_title")}</h2>
                <button
                  type="button"
                  onClick={addExtraSection}
                  className="rounded-lg bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t("resume_builder_add_section")}
                </button>
              </div>

              <div className="mt-5 space-y-5">
                {extraSections.map((section, index) => (
                  <div key={section.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        {t("builder_optional_section").replace("{n}", String(index + 1))}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeExtraSection(section.id)}
                        className="text-sm font-medium text-red-600"
                      >
                        {t("resume_builder_remove")}
                      </button>
                    </div>

                    <input
                      placeholder={t("resume_builder_ph_section_title")}
                      value={section.title}
                      onChange={(e) => updateExtraSection(section.id, "title", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                    />

                    <textarea
                      placeholder={t("resume_builder_ph_section_content")}
                      value={section.content}
                      onChange={(e) => updateExtraSection(section.id, "content", e.target.value)}
                      className="mt-4 min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Link
                href="/resume/review"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t("builder_back_to_review")}
              </Link>
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                className="rounded-xl bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                {t("builder_download")}
              </button>
            </div>
          </section>

          <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">{t("resume_builder_preview_heading")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("resume_builder_preview_hint")}</p>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-start gap-4">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Resume profile"
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-xs text-slate-400">
                      Photo
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-2xl font-semibold text-navy-950">{fullName || "Your Name"}</h3>
                    <p className="mt-1 text-sm font-medium text-slate-600">{targetRole}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {email} • {phone} • {location}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("resume_builder_preview_summary")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{summary}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("resume_builder_preview_experience")}
                    </p>
                    <div className="mt-3 space-y-4">
                      {experiences.map((item) =>
                        item.jobTitle || item.company ? (
                          <div key={item.id}>
                            <p className="text-sm font-semibold text-slate-800">
                              {item.jobTitle || t("resume_builder_ph_job_title")}
                              {item.company ? ` • ${item.company}` : ""}
                            </p>
                            <p className="text-xs text-slate-500">
                              {[
                                item.location,
                                item.startYear ? formatDate(item.startMonth, item.startYear) : null,
                                item.endIsPresent ? t("builder_present_only") : item.endYear ? formatDate(item.endMonth, item.endYear) : null,
                              ].filter(Boolean).join(" • ")}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {item.description}
                            </p>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("resume_builder_skills_title")}
                    </p>
                    <div className="mt-3 space-y-3">
                      {filledSkills.map((skill) => (
                        <div key={skill.id}>
                          <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                            <span>{skill.name}</span>
                            <span>{skill.level}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div
                              className="h-2 rounded-full bg-navy-950"
                              style={{ width: `${skill.level}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("resume_builder_preview_education")}
                    </p>
                    <div className="mt-3 space-y-4">
                      {educations.map((item) =>
                        item.school || item.qualification ? (
                          <div key={item.id}>
                            <p className="text-sm font-semibold text-slate-800">
                              {item.qualification || t("resume_builder_ph_qualification")}
                              {item.fieldOfStudy
                                ? `${t("resume_builder_preview_in_field")}${item.fieldOfStudy}`
                                : ""}
                            </p>
                            <p className="text-sm text-slate-700">{item.school}</p>
                            <p className="text-xs text-slate-500">
                              {[
                                item.startYear ? formatDate(item.startMonth, item.startYear) : null,
                                item.endIsPresent ? t("builder_present_only") : item.endYear ? formatDate(item.endMonth, item.endYear) : null,
                              ].filter(Boolean).join(" – ")}
                            </p>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>

                  {extraSections
                    .filter((section) => section.title.trim() || section.content.trim())
                    .map((section) => (
                      <div key={section.id}>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {section.title || t("resume_builder_optional_section_item")}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {section.content}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">{t("resume_builder_next_title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("resume_builder_next_description")}</p>

              <Link
                href="/jobs"
                className="mt-4 inline-flex rounded-xl bg-navy-950 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                {t("nav_job_matching")}
              </Link>
            </div>
          </aside>
        </div>
      </section>
      {showTemplatePicker ? (
        <TemplatePickerModal
          data={buildTemplateData()}
          onClose={() => setShowTemplatePicker(false)}
        />
      ) : null}
    </main>
  );
}