"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import AzureAvatarStage from "@/components/interview/AzureAvatarStage";

type InterviewRole =
  | "general"
  | "operations_executive"
  | "project_coordinator"
  | "software_engineer";

type InterviewType = "hr" | "behavioral" | "technical";
type Difficulty = "easy" | "medium" | "hard";

type AgentState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

type ConversationMessage = {
  id: string;
  speaker: "agent" | "user" | "system";
  text: string;
  timestamp: string;
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getOpeningLine(locale: string, role: InterviewRole, interviewType: InterviewType) {
  const roleLabel =
    role === "operations_executive"
      ? "Operations Executive"
      : role === "project_coordinator"
      ? "Project Coordinator"
      : role === "software_engineer"
      ? "Software Engineer"
      : "your target role";

  if (locale === "zh") {
    return `你好，我会担任你的 AI 面试官。我们将开始一场 ${roleLabel} 的${
      interviewType === "technical" ? "技术" : interviewType === "behavioral" ? "行为" : "人事"
    }面试练习。请先简单介绍自己。`;
  }

  if (locale === "ms") {
    return `Hai, saya akan menjadi penemuduga AI anda. Kita akan mulakan sesi latihan temu duga ${
      interviewType === "technical" ? "teknikal" : interviewType === "behavioral" ? "tingkah laku" : "HR"
    } untuk jawatan ${roleLabel}. Sila mulakan dengan memperkenalkan diri anda.`;
  }

  if (locale === "ta") {
    return `வணக்கம், நான் உங்கள் AI நேர்காணல் முகவராக இருப்பேன். ${roleLabel} பதவிக்கான ${
      interviewType === "technical" ? "தொழில்நுட்ப" : interviewType === "behavioral" ? "நடத்தை சார்ந்த" : "மனிதவள"
    } நேர்காணல் பயிற்சியை தொடங்கலாம். முதலில் உங்களை அறிமுகப்படுத்துங்கள்.`;
  }

  return `Hi, I’ll be your AI interviewer. We’re starting a ${interviewType} interview practice session for a ${roleLabel} role. Please begin by introducing yourself.`;
}


export default function InterviewPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const safeLocale =
    locale === "en" || locale === "zh" || locale === "ms" || locale === "ta"
      ? locale
      : "en";

  const [role, setRole] = useState<InterviewRole>("general");
  const [interviewType, setInterviewType] = useState<InterviewType>("hr");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);

  const [coaching, setCoaching] = useState<{
    score: number;
    strengths: string[];
    improvements: string[];
  }>({ score: 0, strengths: [], improvements: [] });

  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const recognizerRef = useRef<{
    stopContinuousRecognitionAsync: (cb?: () => void, err?: (e: string) => void) => void;
  } | null>(null);

  async function handleMicClick() {
    if (micState === "listening") {
      recognizerRef.current?.stopContinuousRecognitionAsync(
        () => setMicState("idle"),
        () => setMicState("idle"),
      );
      return;
    }

    setMicState("processing");
    try {
      const res = await fetch("/api/speech");
      if (!res.ok) throw new Error("Failed to get speech token");
      const { token, region } = await res.json();

      const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "en-SG";
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizerRef.current = recognizer;

      recognizer.recognized = (_: unknown, e: { result: { reason: number; text: string } }) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
          setTextInput((prev) => (prev ? prev + " " + e.result.text : e.result.text));
        }
      };

      recognizer.startContinuousRecognitionAsync(
        () => setMicState("listening"),
        (err: string) => {
          console.error("Speech recognition error:", err);
          setMicState("idle");
        },
      );
    } catch (err) {
      console.error("Mic setup failed:", err);
      setMicState("idle");
    }
  }

  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const recognizerRef = useRef<{ stop: () => void } | null>(null);

  function handleMicClick() {
    if (micState === "listening") {
      recognizerRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setTextInput((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.onerror = () => setMicState("idle");
    recognition.onend = () => setMicState("idle");

    recognition.start();
    recognizerRef.current = recognition;
    setMicState("listening");
  }

  function startSession() {
    setSessionStarted(true);
    setConversation([
      {
        id: crypto.randomUUID(),
        speaker: "system",
        text: "Interview session started.",
        timestamp: formatTime(),
      },
      {
        id: crypto.randomUUID(),
        speaker: "agent",
        text: getOpeningLine(safeLocale, role, interviewType),
        timestamp: formatTime(),
      },
    ]);
  }

  function endSession() {
    setSessionStarted(false);
    setConversation((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        speaker: "system",
        text: "Interview session ended.",
        timestamp: formatTime(),
      },
    ]);
  }

  async function sendTextReply() {
    if (!textInput.trim()) return;

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      speaker: "user",
      text: textInput.trim(),
      timestamp: formatTime(),
    };

    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setTextInput("");

    try {
      const res = await fetch("/api/interview/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: updatedConversation }),
      });
      if (res.ok) {
        const data = await res.json();
        setCoaching(data);
      }
    } catch {
      // silently keep existing coaching if the request fails
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={
          <button
            type="button"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/");
              router.refresh();
            }}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-navy-950"
          >
            {t("dash_sign_out")}
          </button>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
            {t("nav_interview")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
            AI Interview Agent
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Practice with a live Azure avatar interviewer while keeping setup, transcript, and coaching on one page.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1.4fr)_240px]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-navy-950">Session Setup</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Configure the mock interview before starting.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Target Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as InterviewRole)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                >
                  <option value="general">General</option>
                  <option value="operations_executive">Operations Executive</option>
                  <option value="project_coordinator">Project Coordinator</option>
                  <option value="software_engineer">Software Engineer</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Interview Type</label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                >
                  <option value="hr">HR</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={startSession}
                className="w-full rounded-xl bg-navy-950 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                {sessionStarted ? "Restart Session" : "Start Session"}
              </button>

              <button
                type="button"
                onClick={endSession}
                disabled={!sessionStarted}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                End Session
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Integration Status
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Avatar engine</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Agent state</span>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                    {agentState}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex min-h-[860px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-navy-950">AI Interview Stage</h2>
              <p className="mt-1 text-sm text-slate-600">
                Live Azure avatar on top, transcript and reply area below.
              </p>
            </div>

            <div className="grid flex-1 lg:grid-rows-[460px_minmax(0,1fr)_140px]">
              <div className="border-b border-slate-200 bg-slate-50 p-6">
                <AzureAvatarStage
                  locale={safeLocale}
                  onAgentStateChange={(state) => setAgentState(state)}
                />
              </div>

              <div className="overflow-y-auto bg-white px-6 py-6">
                {!sessionStarted && (
                  <div className="flex h-full min-h-[220px] items-center justify-center text-center">
                    <div>
                      <div className="mx-auto w-fit rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Waiting to start
                      </div>
                      <h3 className="mt-5 font-serif text-2xl font-semibold text-navy-950">
                        Conversation transcript will appear here
                      </h3>
                      <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                        Start the session to let the AI interviewer greet the user and begin the conversation.
                      </p>
                    </div>
                  </div>
                )}

                {conversation.length > 0 && (
                  <div className="space-y-4">
                    {conversation.map((message) => (
                      <div key={message.id}>
                        {message.speaker === "system" ? (
                          <div className="text-center text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                            {message.text}
                          </div>
                        ) : (
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                              message.speaker === "agent"
                                ? "bg-slate-50 text-slate-800"
                                : "ml-auto bg-navy-950 text-white"
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.12em] opacity-70">
                              <span>{message.speaker === "agent" ? "AI Interviewer" : "User"}</span>
                              <span>{message.timestamp}</span>
                            </div>
                            <p className="text-sm leading-6">{message.text}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type the user's reply here, or let your teammate connect live microphone input later..."
                    disabled={!sessionStarted}
                    className="min-h-[92px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-navy-950 disabled:bg-slate-100"
                  />
                  <div className="flex w-32 flex-col gap-3">
                    <button
                      type="button"
                      onClick={sendTextReply}
                      disabled={!sessionStarted || !textInput.trim()}
                      className="rounded-xl bg-[#b88a44] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMicClick()}
                      disabled={!sessionStarted || micState === "processing"}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        micState === "listening"
                          ? "border-red-300 bg-red-50 text-red-600"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {micState === "listening"
                        ? "Listening..."
                        : micState === "processing"
                        ? "Processing..."
                        : "Mic"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-navy-950">Coaching Panel</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Live coaching stays visible while the avatar interviews the user.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Session Score
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy-950">
                {coaching.score > 0 ? `${coaching.score}/100` : "—"}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Strengths
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
                {coaching.strengths.length > 0 ? (
                  coaching.strengths.map((item) => <p key={item}>• {item}</p>)
                ) : (
                  <p>Live strengths will appear as the user answers.</p>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Improvement Areas
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
                {coaching.improvements.length > 0 ? (
                  coaching.improvements.map((item) => <p key={item}>• {item}</p>)
                ) : (
                  <p>Coaching suggestions will appear during the interview.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}