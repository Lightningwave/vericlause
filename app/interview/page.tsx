"use client";

import Link from "next/link";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { useConversation } from "@11labs/react";
import { useLanguage } from "@/components/providers/language-provider";
import { usePlan } from "@/hooks/use-plan";
import { useUsage } from "@/hooks/use-usage";
import type { InterviewScoreResult } from "@/lib/types";


/** Fixed bar heights for speaking indicator (avoid Math.random on each render). */
const SPEAKING_BAR_HEIGHTS_PX = [12, 20, 14, 18, 16];

const INTERVIEWERS = [
  {
    id: "alex",
    name: "Alex",
    role: "Hiring Manager",
    description:
      "Direct, practical, and focuses on your technical expertise.",
    avatar: "https://i.ibb.co/bRRtgr0x/alex.jpg",
    color: "bg-blue-500",
  },
  {
    id: "sophia",
    name: "Sophia",
    role: "Senior Executive Recruiter",
    description:
      "Warm and strategic — she explores leadership, collaboration, and motivation with behavioural questions tailored to your profile.",
    avatar: "https://i.ibb.co/zH2WSZSj/sarah.jpg",
    color: "bg-gold-500",
  },
] as const;

const INTERVIEW_COPY = {
  en: {
    badge: "Interview practice",
    title: "Choose your interviewer",
    subtitle:
      "Pick a style that matches how you want to rehearse. Each host uses a different focus and question style — both use your resume for context.",
    alexRole: "Hiring Manager",
    alexDescription:
      "Direct, practical, and focuses on your technical expertise.",
    sophiaRole: "Senior Executive Recruiter",
    sophiaDescription:
      "Warm and strategic — she explores leadership, collaboration, and motivation with behavioural questions tailored to your profile.",
    practiceWith: "Practice with",
    changeHost: "← Change host",
    liveSession: "Live session",
    readyToJoin: "Ready to join",
    hostLabel: "Host —",
    you: "You",
    notRecorded: "Private practice — not recorded",
    startConversation: "Start conversation",
    connecting: "Connecting…",
    micLabel: "Your mic",
    transcript: "Transcript",
    transcriptHint: "Lines appear as you and the host speak",
    transcriptEmpty:
      "No messages yet. Start the conversation to see what you and {name} say.",
    line: "line",
    lines: "lines",
    interviewScore: "Interview score",
    interviewScoreDesc: "Evidence-backed AI feedback from this transcript.",
    lowConfidence:
      "Low confidence: this score is based on a short sample.",
    scoring: "Scoring your interview…",
    strengths: "Strengths",
    improveNext: "Improve next",
    summary: "Summary",
    newPractice: "New practice",
    muteMic: "Mute your microphone",
    muteTitle: "Mute (display only)",
    unmuteTitle: "Unmute (display only)",
    wrapUp: "Wrap up",
    endSession: "End session",
    footerHint:
      "2-minute practice timer · Allow microphone when prompted",
    notEnough:
      "Not enough conversation to score yet. Try one full answer and end again.",
    createResume: "Create or Upload Resume",
  },
  zh: {
    badge: "面试练习",
    title: "选择你的面试官",
    subtitle:
      "选择适合你练习方式的风格。每位主持人都有不同的提问重点和风格，但都会基于你的简历进行提问。",
    alexRole: "招聘经理",
    alexDescription: "直接、务实，重点考察你的技术能力与执行能力。",
    sophiaRole: "高级招聘主管",
    sophiaDescription:
      "温和且有策略性——她会围绕领导力、协作和求职动机，提出更偏行为面的面试问题。",
    practiceWith: "与以下面试官练习：",
    changeHost: "← 更换主持人",
    liveSession: "实时会话",
    readyToJoin: "准备加入",
    hostLabel: "主持人 —",
    you: "你",
    notRecorded: "私人练习 — 不会被记录",
    startConversation: "开始对话",
    connecting: "连接中…",
    micLabel: "你的麦克风",
    transcript: "对话记录",
    transcriptHint: "你和主持人说话时，内容会显示在这里",
    transcriptEmpty: "暂无消息。开始对话后，这里会显示你和{name}的内容。",
    line: "行",
    lines: "行",
    interviewScore: "面试评分",
    interviewScoreDesc: "基于本次对话记录生成的 AI 反馈。",
    lowConfidence: "置信度较低：这次评分基于较短的对话样本。",
    scoring: "正在为你的面试评分…",
    strengths: "优点",
    improveNext: "下一步改进",
    summary: "总结",
    newPractice: "开始新的练习",
    muteMic: "静音你的麦克风",
    muteTitle: "静音（仅界面显示）",
    unmuteTitle: "取消静音（仅界面显示）",
    wrapUp: "结束总结",
    endSession: "结束会话",
    footerHint: "2 分钟练习计时器 · 出现提示时请允许麦克风权限",
    notEnough:
      "当前对话内容不足以评分。请至少完成一次完整回答后再结束。",
    createResume: "创建或上传简历",
  },
  ms: {
    badge: "Latihan temu duga",
    title: "Pilih penemu duga anda",
    subtitle:
      "Pilih gaya yang paling sesuai dengan cara anda mahu berlatih. Setiap hos mempunyai fokus dan gaya soalan yang berbeza — kedua-duanya menggunakan resume anda sebagai konteks.",
    alexRole: "Pengurus Pengambilan",
    alexDescription:
      "Terus, praktikal, dan memfokus pada kepakaran teknikal anda.",
    sophiaRole: "Perekrut Eksekutif Kanan",
    sophiaDescription:
      "Mesra dan strategik — dia meneroka kepimpinan, kerjasama, dan motivasi dengan soalan tingkah laku yang disesuaikan dengan profil anda.",
    practiceWith: "Berlatih dengan",
    changeHost: "← Tukar hos",
    liveSession: "Sesi langsung",
    readyToJoin: "Sedia untuk masuk",
    hostLabel: "Hos —",
    you: "Anda",
    notRecorded: "Latihan peribadi — tidak dirakam",
    startConversation: "Mulakan perbualan",
    connecting: "Menyambung…",
    micLabel: "Mik anda",
    transcript: "Transkrip",
    transcriptHint: "Baris akan muncul semasa anda dan hos bercakap",
    transcriptEmpty:
      "Belum ada mesej. Mulakan perbualan untuk melihat apa yang anda dan {name} katakan.",
    line: "baris",
    lines: "baris",
    interviewScore: "Skor temu duga",
    interviewScoreDesc:
      "Maklum balas AI berasaskan bukti daripada transkrip ini.",
    lowConfidence:
      "Tahap keyakinan rendah: skor ini berdasarkan sampel yang singkat.",
    scoring: "Sedang menilai temu duga anda…",
    strengths: "Kekuatan",
    improveNext: "Perlu diperbaiki seterusnya",
    summary: "Ringkasan",
    newPractice: "Latihan baharu",
    muteMic: "Senyapkan mikrofon anda",
    muteTitle: "Senyap (paparan sahaja)",
    unmuteTitle: "Buka senyap (paparan sahaja)",
    wrapUp: "Tamatkan",
    endSession: "Tamatkan sesi",
    footerHint: "Pemasa latihan 2 minit · Benarkan mikrofon apabila diminta",
    notEnough:
      "Perbualan belum cukup untuk dinilai. Cuba beri satu jawapan penuh dan tamatkan semula.",
    createResume: "Cipta atau muat naik resume",
  },
  ta: {
    badge: "நேர்முகப் பயிற்சி",
    title: "உங்கள் நேர்முக அதிகாரியைத் தேர்வு செய்யுங்கள்",
    subtitle:
      "நீங்கள் எப்படிப் பயிற்சி செய்ய விரும்புகிறீர்களோ அதற்கேற்ற முறையைத் தேர்ந்தெடுக்கவும். ஒவ்வொரு ஹோஸ்டும் வேறுபட்ட கேள்வி முறை மற்றும் கவனத்தை கொண்டிருப்பார் — இருவரும் உங்கள் ரெஸ்யூமேயை அடிப்படையாகக் கொள்வார்கள்.",
    alexRole: "நியமன மேலாளர்",
    alexDescription:
      "நேரடி, நடைமுறை சார்ந்த, உங்கள் தொழில்நுட்ப திறனை மையமாகக் கொண்டவர்.",
    sophiaRole: "மூத்த நிர்வாக ஆட்சேர்ப்பு நிபுணர்",
    sophiaDescription:
      "அன்பானதும் தந்திரோபாயமுமானவர் — அவர் உங்கள் தலைமையியல், ஒத்துழைப்பு மற்றும் உந்துதலை நடத்தை சார்ந்த கேள்விகளால் ஆராய்வார்.",
    practiceWith: "பயிற்சி செய்ய",
    changeHost: "← ஹோஸ்டை மாற்று",
    liveSession: "நேரடி அமர்வு",
    readyToJoin: "சேரத் தயாராக உள்ளது",
    hostLabel: "ஹோஸ்ட் —",
    you: "நீங்கள்",
    notRecorded: "தனிப்பட்ட பயிற்சி — பதிவு செய்யப்படாது",
    startConversation: "உரையாடலைத் தொடங்கு",
    connecting: "இணைக்கப்படுகிறது…",
    micLabel: "உங்கள் மைக்",
    transcript: "உரையாடல் பதிவு",
    transcriptHint:
      "நீங்களும் ஹோஸ்டும் பேசும் போது வரிகள் இங்கே தோன்றும்",
    transcriptEmpty:
      "இன்னும் செய்திகள் இல்லை. நீங்கள் மற்றும் {name} சொல்வதைப் பார்க்க உரையாடலைத் தொடங்குங்கள்.",
    line: "வரி",
    lines: "வரிகள்",
    interviewScore: "நேர்முக மதிப்பெண்",
    interviewScoreDesc: "இந்த உரையாடல் பதிவின் அடிப்படையில் AI கருத்து.",
    lowConfidence:
      "குறைந்த நம்பகத்தன்மை: இந்த மதிப்பீடு குறுகிய மாதிரியை அடிப்படையாகக் கொண்டது.",
    scoring: "உங்கள் நேர்முகத்திற்கு மதிப்பெண் கணக்கிடப்படுகிறது…",
    strengths: "வலிமைகள்",
    improveNext: "அடுத்து மேம்படுத்த வேண்டியது",
    summary: "சுருக்கம்",
    newPractice: "புதிய பயிற்சி",
    muteMic: "உங்கள் மைக்கை மியூட் செய்யுங்கள்",
    muteTitle: "மியூட் (காட்சி மட்டும்)",
    unmuteTitle: "மியூட்டை நீக்கு (காட்சி மட்டும்)",
    wrapUp: "முடிக்கவும்",
    endSession: "அமர்வை முடி",
    footerHint:
      "2 நிமிடப் பயிற்சி டைமர் · கேட்கப்பட்டால் மைக்ரோஃபோனுக்கு அனுமதி வழங்கவும்",
    notEnough:
      "மதிப்பிட உரையாடல் போதவில்லை. ஒரு முழு பதிலை வழங்கி மீண்டும் முடிக்கவும்.",
    createResume: "ரெஸ்யூமே உருவாக்க அல்லது பதிவேற்றம் செய்யவும்",
  },
} as const;

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const resumeId = searchParams.get("resume_id");
  const { hasFeature, loading: planLoading } = usePlan();
  const { usage } = useUsage();
  
  const contractUsage = usage?.contracts;
  const isLimitReached = contractUsage?.limit != null && contractUsage.used >= contractUsage.limit;
  const canPractice = hasFeature("interviewPractice");

  const copy =
    INTERVIEW_COPY[
      locale === "zh" || locale === "ms" || locale === "ta" ? locale : "en"
    ];

  const interviewers = INTERVIEWERS.map((person) => ({
    ...person,
    role: person.id === "alex" ? copy.alexRole : copy.sophiaRole,
    description:
      person.id === "alex"
        ? copy.alexDescription
        : copy.sophiaDescription,
  }));

  const [selectedInterviewer, setSelectedInterviewer] = useState<
    (typeof interviewers)[0] | null
  >(null);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isIntermediate, setIsIntermediate] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<
    { id: string; role: "user" | "agent"; text: string }[]
  >([]);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<InterviewScoreResult | null>(
    null,
  );
  const transcriptLineIdRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      transcriptLineIdRef.current = 0;
      setTranscript([]);
      setIsInterviewing(true);
      setLoading(false);
      setLastError(null);
      setIsIntermediate(false);
      setScoreError(null);
      setScoreResult(null);
    },
    onDisconnect: () => {
      setIsInterviewing(false);
      setTimeLeft(120);
      setLoading(false);
      setIsIntermediate(false);
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : String(err);
      setLastError(message);
      setIsIntermediate(false);
      setIsInterviewing(false);
      setLoading(false);
    },
    onMessage: ({ role, message }) => {
      const id = `t-${++transcriptLineIdRef.current}`;
      setTranscript((prev) => [...prev, { id, role, text: message }]);
    },
  });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isInterviewing && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isInterviewing, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && isInterviewing) {
      void stopInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isInterviewing]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInterviewing && transcript.length >= 2) {
        const transcriptPayload = transcript.map((line) => ({
          role: line.role,
          text: line.text,
        }));
        const body = JSON.stringify({
          interviewer: selectedInterviewer?.id ?? "alex",
          resume_id: resumeId,
          transcript: transcriptPayload,
        });
        navigator.sendBeacon("/api/interviews/score", body);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isInterviewing, transcript, selectedInterviewer, resumeId]);

  const startInterview = async () => {
    if (!selectedInterviewer || loading || isInterviewing || isIntermediate) {
      return;
    }

    setLoading(true);
    setLastError(null);

    try {
      const url = new URL("/api/interviews/session", window.location.origin);
      if (resumeId) url.searchParams.set("resume_id", resumeId);
      url.searchParams.set("interviewer", selectedInterviewer.id);

      const res = await fetch(url.toString());
      const data = (await res.json()) as {
        detail?: string;
        agent_id: string;
        dynamic_instructions: string;
        first_message: string;
        use_voice_override?: boolean;
        voice_id?: string;
      };

      if (!res.ok) {
        throw new Error(data.detail || "Failed to fetch session config");
      }

      setTimeLeft(120);
      setIsIntermediate(true);

      await conversation.startSession({
        agentId: data.agent_id,
        connectionType: "websocket",
        overrides: {
          agent: {
            prompt: {
              prompt: data.dynamic_instructions,
            },
            firstMessage: data.first_message,
          },
          tts: {
            ...(data.use_voice_override ? { voiceId: data.voice_id } : {}),
          },
        },
      });
    } catch (e: unknown) {
      console.error("Failed to start ElevenLabs session:", e);
      const message =
        e instanceof Error ? e.message : String(e);
      setLastError(message);
      setIsIntermediate(false);
      setLoading(false);
    }
  };

  const stopInterview = async () => {
    await conversation.endSession();
    setIsInterviewing(false);
    setTimeLeft(120);
    setScoreError(null);

    const transcriptPayload = transcript.map((line) => ({
      role: line.role,
      text: line.text,
    }));

    if (transcriptPayload.length >= 2) {
      try {
        setIsScoring(true);
        const res = await fetch("/api/interviews/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewer: selectedInterviewer?.id ?? "alex",
            resume_id: resumeId,
            transcript: transcriptPayload,
          }),
        });
        const data = (await res.json()) as {
          detail?: string;
          score: InterviewScoreResult;
        };
        if (!res.ok) {
          throw new Error(data.detail || "Failed to score interview");
        }
        setScoreResult(data.score);
      } catch (e: unknown) {
        setScoreError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsScoring(false);
      }
    } else {
      setScoreError(copy.notEnough);
    }
  };

  const resetPractice = () => {
    setSelectedInterviewer(null);
    transcriptLineIdRef.current = 0;
    setTranscript([]);
    setScoreResult(null);
    setScoreError(null);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!selectedInterviewer && !isInterviewing) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] font-sans text-slate-900">
        <SiteNavbar rightSlot={<UserMenu />} />
        <main className="mx-auto max-w-5xl px-6 py-14 sm:px-8 lg:py-20">
          <header className="mb-12 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              {copy.badge}
            </p>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-navy-950 sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              {copy.subtitle}
            </p>
          </header>

          {isLimitReached ? (
            <div className="mb-8 rounded-[20px] border border-amber-200 bg-amber-50 px-6 py-5">
               <h3 className="text-sm font-semibold text-amber-900">
                  You have reached your contract analysis limit.
               </h3>
               <p className="mt-1 text-sm text-amber-700">
                  Because interviews share the same tier quotas, please upgrade your plan via the profile dashboard to start more interviews.
               </p>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            {interviewers.map((person) => (
              <button
                key={person.id}
                type="button"
                disabled={isLimitReached}
                onClick={() => {
                  if (!isLimitReached) setSelectedInterviewer(person);
                }}
                className={`group relative rounded-2xl border border-slate-200 bg-white p-8 text-left transition-all ${isLimitReached ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:border-navy-950 hover:shadow-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-950'}`}
              >
                <div className="mb-6 flex items-start gap-5">
                  <div
                    className={`h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl ${person.color} p-0.5 shadow-md ring-1 ring-black/5 transition group-hover:scale-[1.03]`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={person.avatar}
                      alt=""
                      className="h-full w-full rounded-[0.875rem] object-cover"
                    />
                  </div>
                  <div className="min-w-0 pt-1">
                    <h2 className="font-serif text-2xl font-bold text-navy-950">
                      {person.name}
                    </h2>
                    <p className="mt-0.5 text-sm font-medium text-[#b88a44]">
                      {person.role}
                    </p>
                  </div>
                  {!canPractice && !planLoading && (
                    <div className="ml-auto rounded-md bg-navy-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Pro
                    </div>
                  )}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-slate-600">
                  {person.description}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy-950 transition group-hover:gap-3">
                  {copy.practiceWith} {person.name}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 shrink-0"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path
                      d="M5 12h14M12 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#141618] font-sans text-white">
      <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#141618]/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
          {!isInterviewing && (
            <button
              type="button"
              onClick={() => {
                setSelectedInterviewer(null);
                setLastError(null);
              }}
              className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
            >
              {copy.changeHost}
            </button>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                isInterviewing ? "animate-pulse bg-red-500" : "bg-white/30"
              }`}
              aria-hidden
            />
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-white/55">
              {isInterviewing ? copy.liveSession : copy.readyToJoin}
            </span>
          </div>
        </div>
        {isInterviewing && (
          <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white/90 tabular-nums">
            {Math.floor(timeLeft / 60)}:
            {(timeLeft % 60).toString().padStart(2, "0")}
          </div>
        )}
        <span className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 sm:block">
          VeriClause
        </span>
      </header>

      <main className="relative flex flex-1 items-center justify-center p-4 lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
          aria-hidden
        />

        <div className="grid h-full max-h-[min(720px,85vh)] w-full max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 md:items-stretch">
          <div
            className={`relative overflow-hidden rounded-3xl border-2 bg-[#1e2124] shadow-2xl transition-all duration-500 ${
              conversation.isSpeaking
                ? "scale-[1.01] border-[#b88a44]/90 shadow-[#b88a44]/10"
                : "border-white/[0.08]"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-transparent" />
            <div className="relative flex h-full min-h-[320px] w-full flex-col items-center justify-center p-8 sm:p-10">
              <div className="relative">
                <div
                  className={`absolute -inset-5 rounded-full bg-[#b88a44]/15 blur-2xl transition-opacity duration-300 ${
                    conversation.isSpeaking ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div
                  className={`relative h-44 w-44 overflow-hidden rounded-3xl border-[3px] border-white/10 shadow-xl sm:h-48 sm:w-48 ${
                    conversation.isSpeaking
                      ? "ring-2 ring-[#b88a44]/40"
                      : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedInterviewer?.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="mt-7 text-center">
                <h2 className="font-serif text-2xl font-bold tracking-tight">
                  {selectedInterviewer?.name}
                </h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                  {selectedInterviewer?.role}
                </p>
              </div>
              {conversation.isSpeaking && (
                <div className="mt-8 flex h-8 items-end justify-center gap-1">
                  {SPEAKING_BAR_HEIGHTS_PX.map((h, i) => (
                    <div
                      key={i}
                      className="w-1 animate-pulse rounded-full bg-[#b88a44]"
                      style={{
                        height: `${h}px`,
                        animationDelay: `${i * 90}ms`,
                        animationDuration: "0.6s",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md sm:bottom-6 sm:left-6">
              {copy.hostLabel} {selectedInterviewer?.name}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1e2124] shadow-2xl">
            <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center p-8 sm:p-10">
              <div className="flex h-36 w-36 items-center justify-center rounded-full border-[3px] border-white/10 bg-navy-950 font-serif text-4xl font-bold text-white shadow-inner sm:h-40 sm:w-40 sm:text-5xl">
                {copy.you}
              </div>
              <div className="mt-7 text-center">
                <h2 className="text-xl font-bold tracking-tight">{copy.you}</h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-white/40">
                  {copy.notRecorded}
                </p>
              </div>

              {!isInterviewing && !isIntermediate && !loading && (
                canPractice ? (
                  <button
                    type="button"
                    onClick={() => void startInterview()}
                    className="mt-8 rounded-xl bg-[#b88a44] px-8 py-3.5 text-sm font-bold text-navy-950 shadow-lg shadow-[#b88a44]/20 transition hover:bg-[#a67a39] active:scale-[0.98]"
                  >
                    {copy.startConversation}
                  </button>
                ) : (
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <p className="max-w-[240px] text-center text-xs text-white/50">
                      Interview practice is a Pro feature. Upgrade to start your live session.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/billing/checkout", {
                            method: "POST",
                            body: JSON.stringify({ plan: "pro" }),
                          });
                          const { url } = await res.json();
                          if (url) window.location.href = url;
                        } catch (err) {
                          console.error("Checkout error:", err);
                        }
                      }}
                      className="rounded-xl border border-[#b88a44] bg-[#b88a44]/10 px-8 py-3.5 text-sm font-bold text-[#e8cc95] shadow-lg transition hover:bg-[#b88a44]/20 active:scale-[0.98]"
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                )
              )}

              {(loading || isIntermediate) && !isInterviewing && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-[#b88a44]" />
                  <span className="text-center text-xs text-white/50">
                    {copy.connecting}
                  </span>
                </div>
              )}

              {lastError ? (
                <div className="mt-6 max-w-sm rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-center text-xs leading-relaxed text-red-300">
                  <p>{lastError}</p>
                  {(lastError.toLowerCase().includes("no resume") ||
                    lastError.toLowerCase().includes("upload a resume")) && (
                    <div className="mt-3">
                      <Link
                        href="/resume"
                        className="inline-block rounded-lg bg-red-500/20 px-4 py-2 font-semibold text-red-200 transition hover:bg-red-500/30"
                      >
                        {copy.createResume}
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md sm:bottom-6 sm:left-6">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              {copy.micLabel}
            </div>
          </div>

          <section
            aria-label={copy.transcript}
            className="flex max-h-[220px] min-h-[140px] flex-col rounded-2xl border border-white/[0.08] bg-[#16191c] md:col-span-2"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                {copy.transcript}
              </span>
              <span className="text-[10px] text-white/35">
                {transcript.length === 0
                  ? copy.transcriptHint
                  : `${transcript.length} ${
                      transcript.length === 1 ? copy.line : copy.lines
                    }`}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {transcript.length === 0 ? (
                <p className="text-center text-xs leading-relaxed text-white/35">
                  {copy.transcriptEmpty.replace(
                    "{name}",
                    selectedInterviewer?.name ?? copy.hostLabel,
                  )}
                </p>
              ) : (
                <ul className="space-y-3 text-left">
                  {transcript.map((line) => (
                    <li key={line.id} className="text-sm leading-relaxed">
                      <span
                        className={
                          line.role === "user"
                            ? "font-semibold text-emerald-400/95"
                            : "font-semibold text-[#d4b87c]"
                        }
                      >
                        {line.role === "user"
                          ? copy.you
                          : selectedInterviewer?.name ?? copy.hostLabel}
                        <span
                          className="mx-2 font-normal text-white/25"
                          aria-hidden
                        >
                          ·
                        </span>
                      </span>
                      <span className="text-white/85">{line.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div ref={transcriptEndRef} aria-hidden />
            </div>
          </section>

          {(isScoring || scoreResult || scoreError) && (
            <section className="rounded-2xl border border-white/[0.08] bg-[#16191c] p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                    {copy.interviewScore}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {copy.interviewScoreDesc}
                  </p>
                  {scoreResult?.confidence === "low" ? (
                    <p className="mt-1 text-xs text-amber-300/90">
                      {copy.lowConfidence}
                    </p>
                  ) : null}
                </div>
                {scoreResult ? (
                  <div className="rounded-xl border border-[#b88a44]/40 bg-[#b88a44]/15 px-3 py-1.5 text-sm font-bold text-[#e8cc95]">
                    {scoreResult.overall_score}/100
                  </div>
                ) : null}
              </div>

              {isScoring && (
                <div className="mt-4 flex items-center gap-3 text-sm text-white/70">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#b88a44]" />
                  {copy.scoring}
                </div>
              )}

              {scoreError && !isScoring && (
                <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {scoreError}
                </p>
              )}

              {scoreResult && !isScoring && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      {copy.strengths}
                    </h3>
                    {scoreResult.strengths.map((s, i) => (
                      <p
                        key={i}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
                      >
                        {s}
                      </p>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      {copy.improveNext}
                    </h3>
                    {scoreResult.improvements.map((s, i) => (
                      <p
                        key={i}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
                      >
                        {s}
                      </p>
                    ))}
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      {copy.summary}
                    </p>
                    <p className="mt-2 text-sm text-white/85">
                      {scoreResult.summary}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={resetPractice}
                      className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
                    >
                      {copy.newPractice}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 bg-[#1a1d20] px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? copy.unmuteTitle : copy.muteTitle}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all sm:h-14 sm:w-14 ${
                isMuted
                  ? "border-red-500/40 bg-red-500/20 text-red-400"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              {isMuted ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-6 w-6"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-1.12 3.82M12 19v4M8 23h8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-6 w-6"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path
                    d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <span className="hidden text-xs text-white/35 sm:inline">
              {copy.muteMic}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {isInterviewing && timeLeft < 30 && (
              <button
                type="button"
                onClick={() => router.push("/")}
                className="h-12 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white/90 transition hover:bg-white/10 sm:h-14 sm:px-6"
              >
                {copy.wrapUp}
              </button>
            )}
            <button
              type="button"
              onClick={() => void stopInterview()}
              className="h-12 rounded-xl bg-red-600 px-6 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500 sm:h-14 sm:px-8"
            >
              {copy.endSession}
            </button>
          </div>

          <p className="w-full text-center text-[10px] text-white/30 sm:w-auto sm:text-left">
            {copy.footerHint}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}