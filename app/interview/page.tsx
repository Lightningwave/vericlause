"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

type InterviewQuestion = {
  id: number;
  type: string;
  question: string;
};

export default function InterviewPage() {
  const { t } = useLanguage();

  const questions: InterviewQuestion[] = [
    {
      id: 1,
      type: t("interview_type_behavioral"),
      question: t("interview_question_1"),
    },
    {
      id: 2,
      type: t("interview_type_role"),
      question: t("interview_question_2"),
    },
    {
      id: 3,
      type: t("interview_type_situational"),
      question: t("interview_question_3"),
    },
  ];

  const [selectedQuestionId, setSelectedQuestionId] = useState<number>(1);
  const [answer, setAnswer] = useState(
    "I would first clarify the priority of each task, communicate timelines clearly, and organize my work using a checklist so I can deliver accurately and on time."
  );

  const selectedQuestion =
    questions.find((q) => q.id === selectedQuestionId) ?? questions[0];

  return (
    <div className="min-h-screen bg-white">
      <SiteNavbar
        links={[
          { href: "/", label: "nav_home" },
          { href: "/jobs", label: "jobs_nav" },
          { href: "/jobs/recommendation", label: "jobs_recommendation_badge" },
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
            {t("interview_badge")}
          </p>
          <h1 className="font-serif text-4xl font-bold text-navy-950 md:text-5xl">
            {t("interview_title")}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            {t("interview_description")}
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-2xl font-bold text-navy-950">
                {t("interview_questions_title")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("interview_questions_description")}
              </p>

              <div className="mt-5 space-y-3">
                {questions.map((question) => {
                  const isActive = question.id === selectedQuestionId;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setSelectedQuestionId(question.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        isActive
                          ? "border-gold-300 bg-gold-50"
                          : "border-slate-200 bg-white hover:border-navy-200"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                        {question.type}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-navy-950">
                        {question.question}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="font-serif text-lg font-bold text-emerald-800">
                {t("interview_tip_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-700">
                {t("interview_tip_description")}
              </p>
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="border-b border-slate-100 pb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                {selectedQuestion.type}
              </p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
                {selectedQuestion.question}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {t("interview_answer_instruction")}
              </p>
            </div>

            <div className="mt-8">
              <label className="mb-2 block text-sm font-semibold text-navy-950">
                {t("interview_answer_label")}
              </label>
              <textarea
                rows={8}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-navy-300"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-md bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy-800"
              >
                {t("interview_submit_answer")}
              </button>

              <button
                type="button"
                className="cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-400"
                disabled
              >
                {t("interview_voice_button")}
              </button>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                    {t("interview_feedback_badge")}
                  </p>
                  <h3 className="mt-2 font-serif text-xl font-bold text-navy-950">
                    {t("interview_feedback_title")}
                  </h3>
                </div>

                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {t("interview_feedback_score")} 82/100
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-navy-950">
                    {t("interview_feedback_strengths")}
                  </h4>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>• {t("interview_feedback_strength_1")}</li>
                    <li>• {t("interview_feedback_strength_2")}</li>
                    <li>• {t("interview_feedback_strength_3")}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-navy-950">
                    {t("interview_feedback_improve")}
                  </h4>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>• {t("interview_feedback_improve_1")}</li>
                    <li>• {t("interview_feedback_improve_2")}</li>
                    <li>• {t("interview_feedback_improve_3")}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              <Link
                href="/jobs/recommendation"
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
              >
                {t("interview_back_recommendation")}
              </Link>

              <button
                type="button"
                className="rounded-md bg-navy-950 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-navy-800"
              >
                {t("interview_next_question")}
              </button>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}