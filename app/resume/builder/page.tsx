"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";
import { listResumes, getResumeById } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type ExperienceItem = {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};

type EducationItem = {
  id: string;
  school: string;
  qualification: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
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

export default function ResumeBuilderPage() {
  const { t } = useLanguage();

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
      startDate: "2023",
      endDate: "Present",
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
      startDate: "2019",
      endDate: "2022",
    },
  ]);

  const [skills, setSkills] = useState<SkillItem[]>([
    { id: createId(), name: "Communication", level: 85 },
    { id: createId(), name: "Project Coordination", level: 80 },
    { id: createId(), name: "Documentation", level: 90 },
  ]);

  const [extraSections, setExtraSections] = useState<ExtraSection[]>([
    {
      id: createId(),
      title: "Certifications",
      content: "Add certifications, awards, volunteer work, languages, or any other optional section here.",
    },
  ]);

  const [prefillLoading, setPrefillLoading] = useState(true);

  useEffect(() => {
    async function prefillFromResume() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setEmail(user.email);

        console.log("[ResumeBuilder] Fetching resumes from GET /api/resumes …");
        const { resumes } = await listResumes();
        console.log("[ResumeBuilder] listResumes response:", resumes);

        const analyzed = resumes.find((r) => r.parsed_profile);
        if (!analyzed) {
          console.log("[ResumeBuilder] No resume with parsed_profile found. Resumes returned:", resumes.length);
          return;
        }
        console.log("[ResumeBuilder] Found analyzed resume:", analyzed.id, analyzed.file_name);

        console.log(`[ResumeBuilder] Fetching resume detail from GET /api/resumes/${analyzed.id} …`);
        const data = await getResumeById(analyzed.id);
        console.log("[ResumeBuilder] getResumeById response:", data);

        const profile = data?.resume?.parsed_profile;
        if (!profile) {
          console.log("[ResumeBuilder] parsed_profile is null on the fetched resume.");
          return;
        }
        console.log("[ResumeBuilder] parsed_profile:", profile);

        // full_name is not in the ResumeProfile schema — extract from the first
        // non-empty line of raw_text, which is almost always the candidate's name.
        const rawText = data?.resume?.raw_text ?? "";
        const firstLine = rawText.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
        const looksLikeName =
          firstLine.length > 0 &&
          firstLine.length < 60 &&
          !/^\s*(email|phone|mobile|address|resume|curriculum|cv|summary|profile|objective)\b/i.test(firstLine) &&
          !firstLine.includes("@") &&
          !firstLine.includes("|");
        console.log("[ResumeBuilder] Name candidate from raw_text first line:", JSON.stringify(firstLine), "→ using:", looksLikeName);
        if (looksLikeName) setFullName(firstLine);

        if (profile.summary) setSummary(profile.summary);

        if (profile.experiences?.length) {
          setExperiences(
            profile.experiences.map((e) => ({
              id: createId(),
              jobTitle: e.title ?? "",
              company: e.company ?? "",
              location: "",
              startDate: e.start_date ?? "",
              endDate: e.end_date ?? "",
              description: e.description ?? "",
            })),
          );
        }

        if (profile.education?.length) {
          setEducations(
            profile.education.map((ed) => ({
              id: createId(),
              school: ed.institution ?? "",
              qualification: ed.qualification ?? "",
              fieldOfStudy: ed.field_of_study ?? "",
              startDate: "",
              endDate: ed.graduation_year != null ? String(ed.graduation_year) : "",
            })),
          );
        }

        if (profile.skills?.length) {
          setSkills(
            profile.skills.slice(0, 12).map((name) => ({
              id: createId(),
              name,
              level: 75,
            })),
          );
        }

        if (profile.headline) setTargetRole(profile.headline);

        console.log("[ResumeBuilder] Pre-fill complete.");
      } catch (err) {
        console.error("[ResumeBuilder] prefillFromResume error:", err);
      } finally {
        setPrefillLoading(false);
      }
    }

    void prefillFromResume();
  }, []);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  function updateExperience(id: string, field: keyof ExperienceItem, value: string) {
    setExperiences((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function addExperience() {
    setExperiences((prev) => [
      ...prev,
      {
        id: createId(),
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        description: "",
      },
    ]);
  }

  function removeExperience(id: string) {
    setExperiences((prev) => prev.filter((item) => item.id !== id));
  }

  function updateEducation(id: string, field: keyof EducationItem, value: string) {
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
        startDate: "",
        endDate: "",
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

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={
          <Link
            href="/contract"
            className="rounded-md bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("nav_dashboard")}
          </Link>
        }
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
          {prefillLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-navy-950" />
              Loading your resume data…
            </p>
          ) : null}
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
                    <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
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
                        placeholder="Company"
                        value={item.company}
                        onChange={(e) => updateExperience(item.id, "company", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                      />
                      <input
                        placeholder={t("resume_builder_ph_location")}
                        value={item.location}
                        onChange={(e) => updateExperience(item.id, "location", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          placeholder="Start"
                          value={item.startDate}
                          onChange={(e) => updateExperience(item.id, "startDate", e.target.value)}
                          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                        />
                        <input
                          placeholder="End"
                          value={item.endDate}
                          onChange={(e) => updateExperience(item.id, "endDate", e.target.value)}
                          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                        />
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
                <h2 className="text-xl font-semibold text-navy-950">Education</h2>
                <button
                  type="button"
                  onClick={addEducation}
                  className="rounded-lg bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Add Education
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
                        placeholder="School"
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
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          placeholder="Start"
                          value={item.startDate}
                          onChange={(e) => updateEducation(item.id, "startDate", e.target.value)}
                          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                        />
                        <input
                          placeholder="End"
                          value={item.endDate}
                          onChange={(e) => updateEducation(item.id, "endDate", e.target.value)}
                          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                        />
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
                      <p className="text-sm font-semibold text-slate-700">Optional Section {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeExtraSection(section.id)}
                        className="text-sm font-medium text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      placeholder={t("resume_builder_ph_section_title")}
                      value={section.title}
                      onChange={(e) => updateExtraSection(section.id, "title", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                    />

                    <textarea
                      placeholder="Add section content"
                      value={section.content}
                      onChange={(e) => updateExtraSection(section.id, "content", e.target.value)}
                      className="mt-4 min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-navy-950"
                    />
                  </div>
                ))}
              </div>
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
                              {[item.location, item.startDate, item.endDate].filter(Boolean).join(" • ")}
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
                              {[item.startDate, item.endDate].filter(Boolean).join(" - ")}
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
    </main>
  );
}