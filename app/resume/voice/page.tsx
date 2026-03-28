"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";

type SupportedLocale = "en" | "zh" | "ms" | "ta";

type VoiceQuestion = {
  id: string;
  section: "basics" | "summary" | "experience" | "education" | "skills";
  prompt: Record<SupportedLocale, string>;
  placeholder: Record<SupportedLocale, string>;
};

type AnswerMap = Record<string, string>;

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionType;
    webkitSpeechRecognition?: new () => SpeechRecognitionType;
  }
}

const browserLangMap: Record<SupportedLocale, string> = {
  en: "en-SG",
  zh: "zh-CN",
  ms: "ms-MY",
  ta: "ta-IN",
};

function ChevronDownFallback() {
  return null;
}

function getBestVoice(locale: SupportedLocale) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();

  const preferredLangs: Record<SupportedLocale, string[]> = {
    en: ["en-SG", "en-GB", "en-US", "en"],
    zh: ["zh-CN", "zh-SG", "zh-TW", "zh"],
    ms: ["ms-MY", "ms", "id-ID"],
    ta: ["ta-IN", "ta-SG", "ta-LK", "ta"],
  };

  const targets = preferredLangs[locale];

  for (const target of targets) {
    const exact = voices.find((voice) => voice.lang.toLowerCase() === target.toLowerCase());
    if (exact) return exact;
  }

  for (const target of targets) {
    const partial = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(target.toLowerCase().split("-")[0]),
    );
    if (partial) return partial;
  }

  return null;
}

export default function VoiceResumePage() {
  const { t, locale } = useLanguage();
  const safeLocale: SupportedLocale =
    locale === "en" || locale === "zh" || locale === "ms" || locale === "ta" ? locale : "en";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [draft, setDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const questions = useMemo<VoiceQuestion[]>(
    () => [
      {
        id: "full_name",
        section: "basics",
        prompt: {
          en: "What is your full name?",
          zh: "请问你的全名是什么？",
          ms: "Apakah nama penuh anda?",
          ta: "உங்கள் முழுப் பெயர் என்ன?",
        },
        placeholder: {
          en: "Say your full name",
          zh: "请说出你的全名",
          ms: "Sebut nama penuh anda",
          ta: "உங்கள் முழுப் பெயரைச் சொல்லுங்கள்",
        },
      },
      {
        id: "job_title",
        section: "basics",
        prompt: {
          en: "What job title are you targeting?",
          zh: "你想申请什么职位？",
          ms: "Apakah jawatan yang anda ingin mohon?",
          ta: "நீங்கள் விண்ணப்பிக்க விரும்பும் வேலைப்பதவி என்ன?",
        },
        placeholder: {
          en: "Say the role you want",
          zh: "请说出你想申请的职位",
          ms: "Sebut jawatan yang anda mahukan",
          ta: "நீங்கள் விரும்பும் பணிப்பதவியைச் சொல்லுங்கள்",
        },
      },
      {
        id: "summary",
        section: "summary",
        prompt: {
          en: "Please describe yourself and your working background in two or three sentences.",
          zh: "请用两到三句话介绍你自己和你的工作背景。",
          ms: "Sila perkenalkan diri anda dan latar belakang kerja anda dalam dua atau tiga ayat.",
          ta: "உங்களைப் பற்றியும் உங்கள் வேலை அனுபவத்தைப் பற்றியும் இரண்டு அல்லது மூன்று வாக்கியங்களில் சொல்லுங்கள்.",
        },
        placeholder: {
          en: "Describe yourself",
          zh: "请介绍你自己",
          ms: "Perkenalkan diri anda",
          ta: "உங்களைப் பற்றிச் சொல்லுங்கள்",
        },
      },
      {
        id: "experience",
        section: "experience",
        prompt: {
          en: "Tell me about your most recent work experience, including your responsibilities.",
          zh: "请介绍你最近的一份工作经验，包括你的职责。",
          ms: "Ceritakan pengalaman kerja terkini anda, termasuk tanggungjawab anda.",
          ta: "உங்கள் சமீபத்திய வேலை அனுபவத்தையும் உங்கள் பொறுப்புகளையும் விளக்குங்கள்.",
        },
        placeholder: {
          en: "Describe your recent job",
          zh: "请描述你最近的工作",
          ms: "Terangkan kerja terkini anda",
          ta: "உங்கள் சமீபத்திய வேலையை விளக்குங்கள்",
        },
      },
      {
        id: "achievement",
        section: "experience",
        prompt: {
          en: "What is one achievement at work that you are proud of?",
          zh: "你在工作中最自豪的一项成就是什么？",
          ms: "Apakah satu pencapaian kerja yang anda banggakan?",
          ta: "வேலையில் நீங்கள் பெருமைப்படும் ஒரு சாதனை என்ன?",
        },
        placeholder: {
          en: "Describe one achievement",
          zh: "请说出一项成就",
          ms: "Terangkan satu pencapaian",
          ta: "ஒரு சாதனையைச் சொல்லுங்கள்",
        },
      },
      {
        id: "education",
        section: "education",
        prompt: {
          en: "Please tell me your education background.",
          zh: "请介绍你的教育背景。",
          ms: "Sila ceritakan latar belakang pendidikan anda.",
          ta: "உங்கள் கல்வி பின்னணியைச் சொல்லுங்கள்.",
        },
        placeholder: {
          en: "State your education",
          zh: "请说出你的教育背景",
          ms: "Nyatakan pendidikan anda",
          ta: "உங்கள் கல்வியைச் சொல்லுங்கள்",
        },
      },
      {
        id: "skills",
        section: "skills",
        prompt: {
          en: "What skills do you want included in your resume?",
          zh: "你希望在简历中加入哪些技能？",
          ms: "Apakah kemahiran yang anda mahu masukkan ke dalam resume anda?",
          ta: "உங்கள் ரெஸ்யூமில் சேர்க்க வேண்டிய திறன்கள் என்ன?",
        },
        placeholder: {
          en: "List your skills",
          zh: "请说出你的技能",
          ms: "Senaraikan kemahiran anda",
          ta: "உங்கள் திறன்களைச் சொல்லுங்கள்",
        },
      },
    ],
    [],
  );

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = browserLangMap[safeLocale];

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }

      setDraft(transcript.trim());
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError(t("voice_input_error"));
    };

    recognitionRef.current = recognition;
  }, [safeLocale, t]);

  useEffect(() => {
    if (!currentQuestion) return;
    speakPrompt(currentQuestion.prompt[safeLocale], safeLocale);
  }, [currentIndex, safeLocale]);

  function speakPrompt(text: string, lang: SupportedLocale) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const matchedVoice = getBestVoice(lang) || (lang === "ta" ? getBestVoice("en") : null);

    utterance.lang = browserLangMap[lang];
    utterance.rate = 1;
    utterance.pitch = 1;

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    }

    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    if (!recognitionRef.current) return;
    setError(null);
    setDraft("");
    recognitionRef.current.lang = browserLangMap[safeLocale];
    recognitionRef.current.start();
    setIsListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function saveAndNext() {
    if (!currentQuestion || !draft.trim()) return;

    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: draft.trim(),
    };

    setAnswers(nextAnswers);
    setDraft("");

    if (isLastQuestion) {
      sessionStorage.setItem("vericlause.voiceResumeAnswers", JSON.stringify(nextAnswers));
      sessionStorage.setItem("vericlause.resumeSource", "voice");
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  }

  function goBack() {
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
  }

  function saveCurrentTextOnly() {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: draft.trim(),
    }));
  }

  const compiledPreview = [
    answers.full_name ? `Name: ${answers.full_name}` : "",
    answers.job_title ? `Target Role: ${answers.job_title}` : "",
    answers.summary ? `Summary: ${answers.summary}` : "",
    answers.experience ? `Experience: ${answers.experience}` : "",
    answers.achievement ? `Achievement: ${answers.achievement}` : "",
    answers.education ? `Education: ${answers.education}` : "",
    answers.skills ? `Skills: ${answers.skills}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const completedCount = Math.min(Object.keys(answers).length + (draft.trim() ? 1 : 0), questions.length);
  const progressPercent = Math.round((completedCount / questions.length) * 100);

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={
          <Link
            href="/resume"
            className="rounded-md bg-navy-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("nav_dashboard")}
          </Link>
        }
      />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            {t("voice_resume_badge")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            {t("voice_resume_title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            {t("voice_resume_description")}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {t("voice_resume_step")} {currentIndex + 1} / {questions.length}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-navy-950">
                  {currentQuestion.prompt[safeLocale]}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => speakPrompt(currentQuestion.prompt[safeLocale], safeLocale)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("voice_resume_repeat")}
              </button>
            </div>

            <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-navy-950 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {!speechSupported && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t("voice_resume_browser_warning")}
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <label className="mb-3 block text-sm font-medium text-slate-700">
                {t("voice_resume_your_answer")}
              </label>

              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={currentQuestion.placeholder[safeLocale]}
                className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-navy-950"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={!speechSupported}
                  className="rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isListening ? t("voice_resume_stop_recording") : t("voice_resume_start_recording")}
                </button>

                <button
                  type="button"
                  onClick={saveCurrentTextOnly}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {t("voice_resume_save_answer")}
                </button>

                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentIndex === 0}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("voice_resume_back")}
                </button>

                <button
                  type="button"
                  onClick={saveAndNext}
                  disabled={!draft.trim()}
                  className="rounded-lg bg-[#b88a44] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLastQuestion ? t("voice_resume_finish") : t("voice_resume_next")}
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-navy-950">{t("voice_resume_preview_title")}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("voice_resume_preview_description")}
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {compiledPreview || t("voice_resume_preview_empty")}
              </pre>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-navy-950">{t("voice_resume_help_title")}</h4>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <p>{t("voice_resume_help_1")}</p>
                <p>{t("voice_resume_help_2")}</p>
                <p>{t("voice_resume_help_3")}</p>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href="/resume"
                className="inline-flex rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("voice_resume_switch_manual")}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}