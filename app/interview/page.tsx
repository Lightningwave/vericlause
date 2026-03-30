"use client";

import Link from "next/link";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { useConversation } from "@11labs/react";

/** Fixed bar heights for speaking indicator (avoid Math.random on each render). */
const SPEAKING_BAR_HEIGHTS_PX = [12, 20, 14, 18, 16];

const INTERVIEWERS = [
    {
        id: "alex",
        name: "Alex",
        role: "Hiring Manager",
        description: "Direct, practical, and focuses on your technical expertise.",
        avatar: "https://i.ibb.co/bRRtgr0x/alex.jpg",
        color: "bg-blue-500"
    },
    {
        id: "sophia",
        name: "Sophia",
        role: "Senior Executive Recruiter",
        description:
            "Warm and strategic — she explores leadership, collaboration, and motivation with behavioural questions tailored to your profile.",
        avatar: "https://i.ibb.co/zH2WSZSj/sarah.jpg",
        color: "bg-gold-500"
    }
];

function InterviewContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const resumeId = searchParams.get("resume_id");

    const [selectedInterviewer, setSelectedInterviewer] = useState<typeof INTERVIEWERS[0] | null>(null);
    const [isInterviewing, setIsInterviewing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120);
    const [lastError, setLastError] = useState<string | null>(null);
    const [isIntermediate, setIsIntermediate] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState<{ id: string; role: "user" | "agent"; text: string }[]>([]);
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
        },
        onDisconnect: () => {
            setIsInterviewing(false);
            setTimeLeft(120);
            setLoading(false);
            setIsIntermediate(false);
        },
        onError: (err: any) => {
            setLastError(err.message || String(err));
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
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        conversation.endSession();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isInterviewing, timeLeft, conversation]);

    const startInterview = async () => {
        if (!selectedInterviewer || loading || isInterviewing || isIntermediate) return;
        setLoading(true);
        setLastError(null);
        try {
            const url = new URL("/api/interviews/session", window.location.origin);
            if (resumeId) url.searchParams.set("resume_id", resumeId);
            url.searchParams.set("interviewer", selectedInterviewer.id);

            const res = await fetch(url.toString());
            const data = await res.json();

            if (!res.ok) throw new Error(data.detail || "Failed to fetch session config");

            setTimeLeft(120);
            setIsIntermediate(true);

            await conversation.startSession({
                agentId: data.agent_id,
                connectionType: "websocket",
                overrides: {
                    agent: {
                        prompt: {
                            prompt: data.dynamic_instructions
                        },
                        firstMessage: data.first_message
                    },
                    tts: {
                        ...(data.use_voice_override ? { voiceId: data.voice_id } : {})
                    }
                }
            });
        } catch (e: any) {
            console.error("Failed to start ElevenLabs session:", e);
            // Check if it's a voice ID error
            const errorMsg = e.message || String(e);
            setLastError(errorMsg);
            setIsIntermediate(false);
            setLoading(false);
        }
    };

    const stopInterview = async () => {
        await conversation.endSession();
        setIsInterviewing(false);
        setTimeLeft(120);
        setSelectedInterviewer(null);
        transcriptLineIdRef.current = 0;
        setTranscript([]);
    };

    const toggleMute = () => {
        // The SDK doesn't have a direct mute method in this version, but we can simulate UI state
        // or actually stop the mic if we had access to the stream. 
        // For now, let's just toggle the UI state.
        setIsMuted(!isMuted);
    };

    if (!selectedInterviewer && !isInterviewing) {
        return (
            <div className="min-h-screen bg-[#f8f8f6] font-sans text-slate-900">
                <SiteNavbar
                    rightSlot={<UserMenu />}
                />
                <main className="mx-auto max-w-5xl px-6 py-14 sm:px-8 lg:py-20">
                    <header className="mb-12 max-w-2xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
                            Interview practice
                        </p>
                        <h1 className="font-serif text-4xl font-bold tracking-tight text-navy-950 sm:text-5xl">
                            Choose your interviewer
                        </h1>
                        <p className="mt-4 text-lg leading-relaxed text-slate-600">
                            Pick a style that matches how you want to rehearse. Each host uses a different focus and question style — both use your resume for context.
                        </p>
                    </header>

                    <div className="grid gap-6 md:grid-cols-2 md:gap-8">
                        {INTERVIEWERS.map((person) => (
                            <button
                                key={person.id}
                                type="button"
                                onClick={() => setSelectedInterviewer(person)}
                                className="group relative rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-navy-950 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-950"
                            >
                                <div className="mb-6 flex items-start gap-5">
                                    <div
                                        className={`h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl ${person.color} p-0.5 shadow-md ring-1 ring-black/5 transition group-hover:scale-[1.03]`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element -- external ibb.co avatars */}
                                        <img
                                            src={person.avatar}
                                            alt=""
                                            className="h-full w-full rounded-[0.875rem] object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0 pt-1">
                                        <h2 className="font-serif text-2xl font-bold text-navy-950">{person.name}</h2>
                                        <p className="mt-0.5 text-sm font-medium text-[#b88a44]">{person.role}</p>
                                    </div>
                                </div>
                                <p className="mb-6 text-sm leading-relaxed text-slate-600">{person.description}</p>
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy-950 transition group-hover:gap-3">
                                    Practice with {person.name}
                                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="2" aria-hidden>
                                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
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
                            ← Change host
                        </button>
                    )}
                    <div className="flex min-w-0 items-center gap-2">
                        <span
                            className={`h-2 w-2 shrink-0 rounded-full ${isInterviewing ? "animate-pulse bg-red-500" : "bg-white/30"}`}
                            aria-hidden
                        />
                        <span className="truncate text-xs font-semibold uppercase tracking-wider text-white/55">
                            {isInterviewing ? "Live session" : "Ready to join"}
                        </span>
                    </div>
                </div>
                {isInterviewing && (
                    <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white/90 tabular-nums">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
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
                        backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                        backgroundSize: "36px 36px",
                    }}
                    aria-hidden
                />

                <div className="grid h-full max-h-[min(720px,85vh)] w-full max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 md:items-stretch">
                    {/* Interviewer Feed */}
                    <div
                        className={`relative overflow-hidden rounded-3xl border-2 bg-[#1e2124] shadow-2xl transition-all duration-500 ${
                            conversation.isSpeaking ? "scale-[1.01] border-[#b88a44]/90 shadow-[#b88a44]/10" : "border-white/[0.08]"
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
                                        conversation.isSpeaking ? "ring-2 ring-[#b88a44]/40" : ""
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
                                <h2 className="font-serif text-2xl font-bold tracking-tight">{selectedInterviewer?.name}</h2>
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
                            Host — {selectedInterviewer?.name}
                        </div>
                    </div>

                    {/* User Feed */}
                    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1e2124] shadow-2xl">
                        <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center p-8 sm:p-10">
                            <div className="flex h-36 w-36 items-center justify-center rounded-full border-[3px] border-white/10 bg-navy-950 font-serif text-4xl font-bold text-white shadow-inner sm:h-40 sm:w-40 sm:text-5xl">
                                You
                            </div>
                            <div className="mt-7 text-center">
                                <h2 className="text-xl font-bold tracking-tight">You</h2>
                                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-white/40">
                                    Private practice — not recorded
                                </p>
                            </div>

                            {!isInterviewing && !isIntermediate && !loading && (
                                <button
                                    type="button"
                                    onClick={() => void startInterview()}
                                    className="mt-8 rounded-xl bg-[#b88a44] px-8 py-3.5 text-sm font-bold text-navy-950 shadow-lg shadow-[#b88a44]/20 transition hover:bg-[#a67a39] active:scale-[0.98]"
                                >
                                    Start conversation
                                </button>
                            )}

                            {(loading || isIntermediate) && !isInterviewing && (
                                <div className="mt-8 flex flex-col items-center gap-3">
                                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-[#b88a44]" />
                                    <span className="text-center text-xs text-white/50">Connecting…</span>
                                </div>
                            )}

                            {lastError ? (
                                <div className="mt-6 max-w-sm rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-center text-xs leading-relaxed text-red-300">
                                    {lastError}
                                </div>
                            ) : null}
                        </div>
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md sm:bottom-6 sm:left-6">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                            Your mic
                        </div>
                    </div>

                    {/* Live transcript — populated from ElevenLabs onMessage (browser only, not saved). */}
                    <section
                        aria-label="Conversation transcript"
                        className="flex max-h-[220px] min-h-[140px] flex-col rounded-2xl border border-white/[0.08] bg-[#16191c] md:col-span-2"
                    >
                        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                                Transcript
                            </span>
                            <span className="text-[10px] text-white/35">
                                {transcript.length === 0 ? "Lines appear as you and the host speak" : `${transcript.length} line${transcript.length === 1 ? "" : "s"}`}
                            </span>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                            {transcript.length === 0 ? (
                                <p className="text-center text-xs leading-relaxed text-white/35">
                                    No messages yet. Start the conversation to see what you and {selectedInterviewer?.name} say.
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
                                                {line.role === "user" ? "You" : selectedInterviewer?.name ?? "Host"}
                                                <span className="mx-2 font-normal text-white/25" aria-hidden>
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
                </div>
            </main>

            <footer className="relative z-10 border-t border-white/5 bg-[#1a1d20] px-4 py-5 sm:px-8">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={toggleMute}
                            title={isMuted ? "Unmute (display only)" : "Mute (display only)"}
                            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all sm:h-14 sm:w-14 ${
                                isMuted
                                    ? "border-red-500/40 bg-red-500/20 text-red-400"
                                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                            }`}
                        >
                            {isMuted ? (
                                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-1.12 3.82M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>
                        <span className="hidden text-xs text-white/35 sm:inline">Mic status is visual only in this build</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        {isInterviewing && timeLeft < 30 && (
                            <button
                                type="button"
                                onClick={() => router.push("/")}
                                className="h-12 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white/90 transition hover:bg-white/10 sm:h-14 sm:px-6"
                            >
                                Wrap up
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => void stopInterview()}
                            className="h-12 rounded-xl bg-red-600 px-6 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500 sm:h-14 sm:px-8"
                        >
                            End session
                        </button>
                    </div>

                    <p className="w-full text-center text-[10px] text-white/30 sm:w-auto sm:text-left">
                        2-minute practice timer · Allow microphone when prompted
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default function InterviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
            </div>
        }>
            <InterviewContent />
        </Suspense>
    );
}