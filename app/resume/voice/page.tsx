"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { useLanguage } from "@/components/providers/language-provider";

type SupportedLocale = "en" | "zh" | "ms" | "ta";

type VoiceQuestion = {
  id: string;
  section: "basics" | "summary" | "experience" | "education" | "skills";
  prompt: Record<SupportedLocale, string>;
  placeholder: Record<SupportedLocale, string>;
};

type AnswerMap = Record<string, string>;

const browserLangMap: Record<SupportedLocale, string> = {
  en: "en-SG",
  zh: "zh-CN",
  ms: "ms-MY",
  ta: "ta-IN",
};

const VOICE_RESUME_UI: Record<
  SupportedLocale,
  {
    questionLabels: Record<string, string>;
    questionsTitle: string;
    howItWorksTitle: string;
    howItWorksSteps: string[];
    allResponsesRecorded: string;
    reviewAnswers: string;
    reviewAnswersDescription: string;
    edit: string;
    generatingResume: string;
    generateMyResume: string;
    correctingTranscription: string;
    skip: string;
    saveAndReturn: string;
  }
> = {
  en: {
    questionLabels: {
      full_name: "Full Name",
      age: "Age",
      job_title: "Target Role",
      summary: "About You",
      experience: "Work Experience",
      achievement: "Achievement",
      education: "Education",
      skills: "Skills",
      anything_else: "Additional Info",
    },
    questionsTitle: "Questions",
    howItWorksTitle: "How this works",
    howItWorksSteps: [
      "Click the mic and answer each question naturally.",
      "Review the transcribed text and correct any errors.",
      "Use Skip if a question does not apply to you.",
      "Click Generate Resume at the end to create your resume.",
    ],
    allResponsesRecorded: "All responses recorded.",
    reviewAnswers: "Review your answers",
    reviewAnswersDescription:
      "Review your answers below, then generate your resume.",
    edit: "Edit",
    generatingResume: "Generating your resume…",
    generateMyResume: "Generate My Resume",
    correctingTranscription: "Correcting transcription…",
    skip: "Skip",
    saveAndReturn: "Save & Return",
  },
  zh: {
    questionLabels: {
      full_name: "姓名",
      age: "年龄",
      job_title: "目标职位",
      summary: "关于你自己",
      experience: "工作经验",
      achievement: "成就",
      education: "教育背景",
      skills: "技能",
      anything_else: "补充信息",
    },
    questionsTitle: "问题",
    howItWorksTitle: "使用说明",
    howItWorksSteps: [
      "点击麦克风，并自然回答每个问题。",
      "检查转录内容，并修正任何错误。",
      "如果某个问题不适用，可点击跳过。",
      "最后点击生成简历来创建你的简历。",
    ],
    allResponsesRecorded: "所有回答已记录。",
    reviewAnswers: "检查你的回答",
    reviewAnswersDescription: "请先检查以下回答，然后生成你的简历。",
    edit: "编辑",
    generatingResume: "正在生成你的简历…",
    generateMyResume: "生成我的简历",
    correctingTranscription: "正在修正转录内容…",
    skip: "跳过",
    saveAndReturn: "保存并返回",
  },
  ms: {
    questionLabels: {
      full_name: "Nama Penuh",
      age: "Umur",
      job_title: "Jawatan Sasaran",
      summary: "Tentang Anda",
      experience: "Pengalaman Kerja",
      achievement: "Pencapaian",
      education: "Pendidikan",
      skills: "Kemahiran",
      anything_else: "Maklumat Tambahan",
    },
    questionsTitle: "Soalan",
    howItWorksTitle: "Cara ia berfungsi",
    howItWorksSteps: [
      "Klik mikrofon dan jawab setiap soalan secara semula jadi.",
      "Semak teks transkrip dan betulkan sebarang ralat.",
      "Gunakan Langkau jika soalan tidak berkaitan dengan anda.",
      "Klik Jana Resume pada akhir untuk mencipta resume anda.",
    ],
    allResponsesRecorded: "Semua jawapan telah direkodkan.",
    reviewAnswers: "Semak jawapan anda",
    reviewAnswersDescription:
      "Semak jawapan anda di bawah, kemudian jana resume anda.",
    edit: "Edit",
    generatingResume: "Sedang menjana resume anda…",
    generateMyResume: "Jana Resume Saya",
    correctingTranscription: "Sedang membetulkan transkripsi…",
    skip: "Langkau",
    saveAndReturn: "Simpan & Kembali",
  },
  ta: {
    questionLabels: {
      full_name: "முழுப்பெயர்",
      age: "வயது",
      job_title: "இலக்கு பணி",
      summary: "உங்களைப் பற்றி",
      experience: "வேலை அனுபவம்",
      achievement: "சாதனை",
      education: "கல்வி",
      skills: "திறன்கள்",
      anything_else: "கூடுதல் தகவல்",
    },
    questionsTitle: "கேள்விகள்",
    howItWorksTitle: "இது எப்படி செயல்படுகிறது",
    howItWorksSteps: [
      "மைக்ரோஃபோனை அழுத்தி ஒவ்வொரு கேள்விக்கும் இயல்பாக பதிலளிக்கவும்.",
      "மாற்றிய உரையை பார்த்து பிழைகள் இருந்தால் திருத்தவும்.",
      "ஒரு கேள்வி உங்களுக்கு பொருந்தாவிட்டால் தவிர் என்பதைப் பயன்படுத்தவும்.",
      "முடிவில் Resume உருவாக்க என்பதைக் கிளிக் செய்து உங்கள் resume-ஐ உருவாக்கவும்.",
    ],
    allResponsesRecorded: "அனைத்து பதில்களும் பதிவு செய்யப்பட்டன.",
    reviewAnswers: "உங்கள் பதில்களைப் பார்க்கவும்",
    reviewAnswersDescription:
      "கீழே உள்ள பதில்களை சரிபார்த்து, பிறகு உங்கள் resume-ஐ உருவாக்கவும்.",
    edit: "திருத்து",
    generatingResume: "உங்கள் resume உருவாக்கப்படுகிறது…",
    generateMyResume: "என் Resume-ஐ உருவாக்கு",
    correctingTranscription: "உரைமாற்றம் திருத்தப்படுகிறது…",
    skip: "தவிர்",
    saveAndReturn: "சேமித்து திரும்பு",
  },
};

// FIX 1 — detect letter-by-letter name spelling
function isSpelledOut(text: string): boolean {
  const tokens = text.trim().split(/\s+/);
  const singleCharCount = tokens.filter((t) => t.length === 1).length;
  return singleCharCount / tokens.length > 0.5;
}

function reconstructName(text: string): string {
  const tokens = text.trim().split(/\s+/);
  const letters = tokens.filter((t) => t.length === 1).join("");
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
}

// FIX 4 — instant client-side substitutions for common Singapore English errors
function quickCorrect(text: string): string {
  return text
    .replace(/\bwet\b/gi, "web")
    .replace(/\bwhere developer\b/gi, "web developer")
    .replace(/\bwet development\b/gi, "web development")
    .replace(/\bwhere development\b/gi, "web development")
    .replace(/\bcoding with wet\b/gi, "coding with web");
}

function getBestVoice(locale: SupportedLocale) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();

  const preferredLangs: Record<SupportedLocale, string[]> = {
    en: ["en-SG", "en-GB", "en-US", "en"],
    zh: ["zh-CN", "zh-SG", "zh-TW", "zh"],
    ms: ["ms-MY", "ms", "id-ID"],
    ta: ["ta-IN", "ta-SG", "ta-LK", "ta"],
  };

  const targets = preferredLangs[locale];

  for (const target of targets) {
    const exact = voices.find(
      (voice) => voice.lang.toLowerCase() === target.toLowerCase(),
    );
    if (exact) return exact;
  }

  for (const target of targets) {
    const partial = voices.find((voice) =>
      voice.lang
        .toLowerCase()
        .startsWith(target.toLowerCase().split("-")[0]),
    );
    if (partial) return partial;
  }

  return null;
}

export default function VoiceResumePage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const safeLocale: SupportedLocale =
    locale === "en" || locale === "zh" || locale === "ms" || locale === "ta"
      ? locale
      : "en";

  const ui = VOICE_RESUME_UI[safeLocale];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [draft, setDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isAutocorrecting, setIsAutocorrecting] = useState(false);
  const [editingFromFinished, setEditingFromFinished] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const accumulatedTextRef = useRef("");
  const currentTranscriptRef = useRef("");
  const hasRecordedRef = useRef(false);

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
          ta: "உங்கள் கல்வி பின்னணியைச் சொல்லுங்கள்。",
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
      {
        id: "anything_else",
        section: "experience",
        prompt: {
          en: "Is there anything else you would like to add — any achievements, skills, or experiences not covered by the previous questions?",
          zh: "还有其他你想补充的吗——有没有前面未提及的成就、技能或经历？",
          ms: "Adakah terdapat apa-apa lagi yang ingin anda tambah — sebarang pencapaian, kemahiran, atau pengalaman yang tidak diliputi oleh soalan-soalan sebelumnya?",
          ta: "முந்தைய கேள்விகளில் சேர்க்கப்படாத சாதனைகள், திறன்கள் அல்லது அனுபவங்கள் போன்று வேறு ஏதாவது சேர்க்க விரும்புகிறீர்களா?",
        },
        placeholder: {
          en: "Any additional information",
          zh: "其他补充信息",
          ms: "Maklumat tambahan",
          ta: "கூடுதல் தகவல்",
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
    if (typeof window === "undefined") return;

    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!Ctor) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = browserLangMap[safeLocale];

    recognition.onresult = (event: any) => {
      if (!isRecordingRef.current) return;
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      if (finalText) {
        accumulatedTextRef.current = (
          accumulatedTextRef.current +
          " " +
          quickCorrect(finalText)
        ).trim();
      }
      currentTranscriptRef.current = interimText;
      const combined = [
        accumulatedTextRef.current,
        currentTranscriptRef.current,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      setDraft(combined);
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch {}
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      isRecordingRef.current = false;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      isRecordingRef.current = false;
      try {
        recognition.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeLocale]);

  useEffect(() => {
    if (!currentQuestion) return;
    speakPrompt(currentQuestion.prompt[safeLocale], safeLocale);
  }, [currentIndex, safeLocale]);

  // FIX 1 + FIX 2: run after recording stops
  useEffect(() => {
    if (isListening) return;
    if (!hasRecordedRef.current) return;
    if (!draft.trim()) return;
    hasRecordedRef.current = false;

    let textToCorrect = draft;

    // FIX 1: reconstruct letter-by-letter name spelling (question 0 only)
    if (currentIndex === 0 && isSpelledOut(draft)) {
      textToCorrect = reconstructName(draft);
      setDraft(textToCorrect);
      accumulatedTextRef.current = textToCorrect;
    }

    // FIX 2: AI autocorrect
    const qId = questions[currentIndex]?.id;
    const qType =
      qId === "age" ? "age" : qId === "full_name" ? "name" : "general";

    let cancelled = false;
    setIsAutocorrecting(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch("/api/resume/voice-autocorrect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: textToCorrect,
        questionType: qType,
        language: safeLocale,
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(timeout);
        if (!cancelled && data.corrected) {
          setDraft(data.corrected);
          accumulatedTextRef.current = data.corrected;
        }
      })
      .catch(() => clearTimeout(timeout))
      .finally(() => {
        if (!cancelled) setIsAutocorrecting(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  function speakPrompt(text: string, lang: SupportedLocale) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const matchedVoice =
      getBestVoice(lang) || (lang === "ta" ? getBestVoice("en") : null);

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
    accumulatedTextRef.current = draft;
    currentTranscriptRef.current = "";
    isRecordingRef.current = true;
    hasRecordedRef.current = true;
    recognitionRef.current.start();
    setIsListening(true);
  }

  function stopListening() {
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
  }

  function jumpToQuestion(index: number) {
    if (isListening) stopListening();
    hasRecordedRef.current = false;
    setEditingFromFinished(true);
    setCurrentIndex(index);
    const existing = answers[questions[index].id] ?? "";
    setDraft(existing);
    accumulatedTextRef.current = existing;
    currentTranscriptRef.current = "";
    setFinished(false);
  }

  function saveAndNext() {
    if (!currentQuestion || !draft.trim()) return;

    const answer = draft.trim();

    setDraft("");
    accumulatedTextRef.current = "";
    currentTranscriptRef.current = "";

    if (isListening) stopListening();

    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: answer,
    };

    setAnswers(nextAnswers);
    sessionStorage.setItem(
      "vericlause.voiceResumeAnswers",
      JSON.stringify(nextAnswers),
    );
    sessionStorage.setItem("vericlause.resumeSource", "voice");

    if (editingFromFinished) {
      setEditingFromFinished(false);
      setFinished(true);
      return;
    }

    if (isLastQuestion) {
      setFinished(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  }

  function skipQuestion() {
    if (isListening) stopListening();
    hasRecordedRef.current = false;
    setDraft("");
    accumulatedTextRef.current = "";
    currentTranscriptRef.current = "";

    if (editingFromFinished) {
      setEditingFromFinished(false);
      setFinished(true);
      return;
    }

    if (isLastQuestion) {
      sessionStorage.setItem(
        "vericlause.voiceResumeAnswers",
        JSON.stringify(answers),
      );
      sessionStorage.setItem("vericlause.resumeSource", "voice");
      setFinished(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  }

  function handleMicClick() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  function goBack() {
    if (currentIndex === 0) return;
    if (isListening) stopListening();
    accumulatedTextRef.current = "";
    currentTranscriptRef.current = "";
    setDraft("");
    setCurrentIndex((prev) => prev - 1);
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
        body: JSON.stringify({ ...storedAnswers, language: safeLocale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      if (data.resumeId) {
        sessionStorage.setItem("vericlause.lastResumeId", data.resumeId);
        if (data.feedback) {
          sessionStorage.setItem(
            "vericlause.resumeFeedback",
            JSON.stringify(data.feedback),
          );
        }
        router.push(`/resume/review?resume_id=${data.resumeId}`);
      } else {
        router.push("/resume/review");
      }
    } catch (e) {
      setGenerateError(
        e instanceof Error ? e.message : "Generation failed",
      );
      setGenerating(false);
    }
  }

  const completedCount = Math.min(
    Object.keys(answers).length + (draft.trim() ? 1 : 0),
    questions.length,
  );
  const progressPercent = Math.round(
    (completedCount / questions.length) * 100,
  );

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar rightSlot={<UserMenu />} />

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
          {finished ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h2 className="font-serif text-2xl font-semibold text-navy-950">
                  {ui.allResponsesRecorded}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {ui.reviewAnswersDescription}
                </p>
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {ui.reviewAnswers}
                </h3>
                <div className="space-y-2">
                  {questions.map((q, i) => {
                    const answer = answers[q.id];
                    if (!answer) return null;
                    return (
                      <div
                        key={q.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-500">
                            {ui.questionLabels[q.id] ?? q.id}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-slate-800">
                            {answer}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => jumpToQuestion(i)}
                          className="flex-shrink-0 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          {ui.edit}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {generateError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {generateError}
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="mt-6 w-full rounded-xl bg-navy-950 px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? ui.generatingResume : ui.generateMyResume}
              </button>
            </div>
          ) : (
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
                  onClick={() =>
                    speakPrompt(currentQuestion.prompt[safeLocale], safeLocale)
                  }
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

                {isAutocorrecting && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    {ui.correctingTranscription}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    {isListening && (
                      <span className="absolute inline-flex h-12 w-12 animate-ping rounded-full bg-red-400 opacity-25" />
                    )}
                    <button
                      type="button"
                      onClick={handleMicClick}
                      disabled={!speechSupported}
                      title={
                        isListening
                          ? t("voice_resume_stop_recording")
                          : t("voice_resume_start_recording")
                      }
                      className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isListening
                          ? "border-red-300 bg-red-50 text-red-600"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6" />
                      </svg>
                    </button>
                  </div>

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
                    onClick={skipQuestion}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {ui.skip}
                  </button>

                  <button
                    type="button"
                    onClick={saveAndNext}
                    disabled={!draft.trim()}
                    className="rounded-lg bg-[#b88a44] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {editingFromFinished
                      ? ui.saveAndReturn
                      : isLastQuestion
                        ? t("voice_resume_finish")
                        : t("voice_resume_next")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {ui.questionsTitle}
            </h3>
            <ol className="mt-3 space-y-1">
              {questions.map((q, i) => {
                const isActive = i === currentIndex && !finished;
                const isCompleted = q.id in answers;
                return (
                  <li
                    key={q.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isActive
                        ? "bg-navy-950 text-white"
                        : isCompleted
                          ? "text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          isActive
                            ? "bg-white/20 text-white"
                            : isCompleted
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="truncate">
                        {ui.questionLabels[q.id] ?? q.id}
                      </span>
                    </div>
                    {answers[q.id] && (
                      <p className="mt-1 ml-8 line-clamp-2 text-xs leading-relaxed text-gray-500">
                        {answers[q.id]}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold text-navy-950">
                {ui.howItWorksTitle}
              </h3>
              <ol className="mt-3 space-y-3">
                {ui.howItWorksSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}