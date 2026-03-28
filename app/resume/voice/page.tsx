"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const safeLocale: SupportedLocale =
    locale === "en" || locale === "zh" || locale === "ms" || locale === "ta" ? locale : "en";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [draft, setDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const isRecordingRef = useRef(false);
  const accumulatedTextRef = useRef("");
  const currentTranscriptRef = useRef("");

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
        id: "age",
        section: "basics",
        prompt: {
          en: "How old are you?",
          zh: "你几岁了？",
          ms: "Berapa umur anda?",
          ta: "உங்கள் வயது என்ன?",
        },
        placeholder: {
          en: "Say your age",
          zh: "请说出你的年龄",
          ms: "Sebut umur anda",
          ta: "உங்கள் வயதைச் சொல்லுங்கள்",
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

    // Stop any active recording when locale changes
    isRecordingRef.current = false;
    setIsListening(false);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = browserLangMap[safeLocale];

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }

      if (finalText) {
        accumulatedTextRef.current = (accumulatedTextRef.current + " " + finalText).trim();
      }
      currentTranscriptRef.current = interimText;

      const combined = [accumulatedTextRef.current, currentTranscriptRef.current]
        .filter(Boolean)
        .join(" ")
        .trim();
      setDraft(combined);
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch {
          // recognition may already be starting; ignore
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      isRecordingRef.current = false;
      setIsListening(false);
      setError(t("voice_input_error"));
    };

    recognitionRef.current = recognition;

    return () => {
      isRecordingRef.current = false;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
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
    // Preserve any existing manually typed text
    accumulatedTextRef.current = draft;
    currentTranscriptRef.current = "";
    recognitionRef.current.lang = browserLangMap[safeLocale];
    isRecordingRef.current = true;
    recognitionRef.current.start();
    setIsListening(true);
  }

  function stopListening() {
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    // isListening set to false via onend → setIsListening(false)
  }

  function saveAndNext() {
    if (!currentQuestion || !draft.trim()) return;

    if (isListening) stopListening();

    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: draft.trim(),
    };

    setAnswers(nextAnswers);
    setDraft("");
    accumulatedTextRef.current = "";
    currentTranscriptRef.current = "";

    if (isLastQuestion) {
      sessionStorage.setItem("vericlause.voiceResumeAnswers", JSON.stringify(nextAnswers));
      sessionStorage.setItem("vericlause.resumeSource", "voice");
      setFinished(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  }

  function goBack() {
    if (currentIndex === 0) return;
    if (isListening) stopListening();
    accumulatedTextRef.current = "";
    currentTranscriptRef.current = "";
    setDraft("");
    setCurrentIndex((prev) => prev - 1);
  }

  function saveCurrentTextOnly() {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: draft.trim(),
    }));
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const storedAnswers = JSON.parse(
        sessionStorage.getItem("vericlause.voiceResumeAnswers") || "{}",
      );
      const res = await fetch("/api/resume/voice-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storedAnswers),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      if (data.resume_id) {
        sessionStorage.setItem("vericlause.lastResumeId", data.resume_id);
        router.push(`/resume/review?resume_id=${data.resume_id}`);
      } else {
        sessionStorage.setItem("vericlause.voiceResumeResult", JSON.stringify(data));
        router.push("/resume/review");
      }
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Generation failed");
      setGenerating(false);
    }
  }

  const compiledPreview = [
    answers.full_name ? `Name: ${answers.full_name}` : "",
    answers.age ? `Age: ${answers.age}` : "",
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

  if (finished) {
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

        <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <div className="mb-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
              ✓
            </div>
            <h1 className="font-serif text-3xl font-semibold text-navy-950">
              All answers recorded!
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Click below to generate your professional resume with AI.
            </p>
          </div>

          {generateError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {generateError}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-xl bg-navy-950 px-8 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "Generating your resume…" : "Generate My Resume"}
          </button>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setFinished(false);
                setCurrentIndex(questions.length - 1);
              }}
              className="text-sm font-medium text-slate-600 underline"
            >
              Go back and review answers
            </button>
          </div>
        </section>
      </main>
    );
  }

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
                onChange={(e) => {
                  setDraft(e.target.value);
                  accumulatedTextRef.current = e.target.value;
                }}
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
