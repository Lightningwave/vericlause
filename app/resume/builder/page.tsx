"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

type ExperienceItem = {
  id: number;
  role: string;
  company: string;
  period: string;
  description: string;
};

export default function ResumeBuilderPage() {
  const { t } = useLanguage();

  const [summary, setSummary] = useState(
    "Detail-oriented professional with experience in coordination, operations support, and stakeholder communication."
  );

  const [skills, setSkills] = useState(
    "Communication, Microsoft Office, Project Coordination, Reporting"
  );

  const [education, setEducation] = useState(
    "Diploma in Business Administration"
  );

  const [experiences, setExperiences] = useState<ExperienceItem[]>([
    {
      id: 1,
      role: "Operations Executive",
      company: "ABC Company",
      period: "2022 - Present",
      description:
        "Managed documentation, coordinated internal teams, and supported reporting timelines.",
    },
    {
      id: 2,
      role: "Customer Support Associate",
      company: "XYZ Services",
      period: "2020 - 2022",
      description:
        "Handled client communication, tracked issues, and maintained support records.",
    },
  ]);

  function updateExperience(
    id: number,
    field: keyof ExperienceItem,
    value: string
  ) {
    setExperiences((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  }

  function addExperience() {
    setExperiences((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "",
        company: "",
        period: "",
        description: "",
      },
    ]);
  }

  function removeExperience(id: number) {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteNavbar
        links={[
          { href: "/", label: "nav_home" },
          { href: "/resume", label: "nav_resume" },
          { href: "/resume/review", label: "resume_review_nav" },
        ]}
        rightSlot={
          <Link
            href="/auth/sign-in"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
          >
            {t("sign_in")}
          </Link>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-14 md:py-18">
        <section className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-600">
            {t("resume_builder_badge")}
          </p>
          <h1 className="font-serif text-4xl font-bold text-navy-950 md:text-5xl">
            {t("resume_builder_title")}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            {t("resume_builder_description")}
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                    {t("resume_builder_section")}
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
                    {t("resume_builder_summary_title")}
                  </h2>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_builder_ai_rewrite")}
                </button>
              </div>

              <textarea
                rows={5}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-navy-300"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                    {t("resume_builder_section")}
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
                    {t("resume_builder_experience_title")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={addExperience}
                  className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-navy-800"
                >
                  {t("resume_builder_add_experience")}
                </button>
              </div>

              <div className="space-y-6">
                {experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-navy-950">
                          {t("resume_builder_role")}
                        </label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) =>
                            updateExperience(exp.id, "role", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy-300"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-navy-950">
                          {t("resume_builder_company")}
                        </label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) =>
                            updateExperience(exp.id, "company", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy-300"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-navy-950">
                          {t("resume_builder_period")}
                        </label>
                        <input
                          type="text"
                          value={exp.period}
                          onChange={(e) =>
                            updateExperience(exp.id, "period", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy-300"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-navy-950">
                          {t("resume_builder_description_label")}
                        </label>
                        <textarea
                          rows={4}
                          value={exp.description}
                          onChange={(e) =>
                            updateExperience(exp.id, "description", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy-300"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                      >
                        {t("resume_builder_improve_bullets")}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExperience(exp.id)}
                        className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-all hover:border-red-300"
                      >
                        {t("resume_builder_remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                  {t("resume_builder_section")}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
                  {t("resume_builder_skills_title")}
                </h2>
              </div>

              <textarea
                rows={4}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-navy-300"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                  {t("resume_builder_section")}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
                  {t("resume_builder_education_title")}
                </h2>
              </div>

              <textarea
                rows={4}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-navy-300"
              />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-navy-950">
                {t("resume_builder_tools_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("resume_builder_tools_description")}
              </p>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_builder_ai_rewrite")}
                </button>
                <button
                  type="button"
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_builder_generate_pdf")}
                </button>
                <button
                  type="button"
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_builder_generate_docx")}
                </button>
                <button
                  type="button"
                  className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-400"
                  disabled
                >
                  {t("resume_builder_voice_assist")}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="font-serif text-lg font-bold text-emerald-800">
                {t("resume_builder_tip_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-700">
                {t("resume_builder_tip_description")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-serif text-lg font-bold text-navy-950">
                {t("resume_builder_next_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("resume_builder_next_description")}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/resume/review"
                  className="rounded-md border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                >
                  {t("resume_builder_back_review")}
                </Link>
                <button
                  type="button"
                  className="rounded-md bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-navy-800"
                >
                  {t("resume_builder_continue_jobs")}
                </button>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}