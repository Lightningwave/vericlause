"use client";

import { useEffect, useRef, useState } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

type AgentState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

type AzureAvatarStageProps = {
  locale: "en" | "zh" | "ms" | "ta";
  onAgentStateChange?: (state: AgentState) => void;
  className?: string;
};

const voiceByLocale: Record<"en" | "zh" | "ms" | "ta", string> = {
  en: "en-SG-LunaNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  ms: "ms-MY-YasminNeural",
  ta: "ta-IN-PallaviNeural",
};

type RelayTokenResponse = {
  Urls: string | string[];
  Username: string;
  Password: string;
};

export default function AzureAvatarStage({
  locale,
  onAgentStateChange,
  className = "",
}: AzureAvatarStageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const avatarRef = useRef<any>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const [connected, setConnected] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [error, setError] = useState<string | null>(null);

  function updateState(next: AgentState) {
    setAgentState(next);
    onAgentStateChange?.(next);
  }

  async function getSpeechToken() {
    const res = await fetch("/api/azure/speech-token", { cache: "no-store" });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.error || "Failed to fetch Azure speech token");
    }

    return json as { token: string; region: string };
  }

  async function getRelayToken() {
    const res = await fetch("/api/azure/avatar-relay", { cache: "no-store" });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.error || "Failed to fetch Azure avatar relay token");
    }

    return json as RelayTokenResponse;
  }

  async function connectAvatar() {
    setError(null);
    updateState("connecting");

    try {
      const { token, region } = await getSpeechToken();
      console.log("Speech token response:", { hasToken: !!token, region });

      const relay = await getRelayToken();
      console.log("Relay response:", relay);

      const urls = Array.isArray(relay.Urls) ? relay.Urls : [relay.Urls];

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls,
            username: relay.Username,
            credential: relay.Password,
          },
        ],
      });

      peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE state:", peerConnection.iceConnectionState);
      };

      peerConnection.onconnectionstatechange = () => {
        console.log("PC state:", peerConnection.connectionState);
      };

      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;
        console.log("Received track:", event.track.kind, stream);

        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = false;
          videoRef.current.autoplay = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch((err) => {
            console.error("Video play error:", err);
          });
        }
      };

      peerConnection.addTransceiver("video", { direction: "recvonly" });
      peerConnection.addTransceiver("audio", { direction: "recvonly" });

      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechSynthesisVoiceName = voiceByLocale[locale];

      const AvatarConfigCtor = (SpeechSDK as any).AvatarConfig;
      const AvatarSynthesizerCtor = (SpeechSDK as any).AvatarSynthesizer;

      if (!AvatarConfigCtor || !AvatarSynthesizerCtor) {
        throw new Error("Azure avatar APIs are not available in the installed Speech SDK.");
      }

      const avatarConfig = new AvatarConfigCtor("lisa", "casual-sitting");
      const avatarSynthesizer = new AvatarSynthesizerCtor(speechConfig, avatarConfig);

      avatarSynthesizer.avatarEventReceived = (_: any, event: any) => {
        const description = String(event?.description || "").toLowerCase();
        console.log("Avatar event:", description);

        if (description.includes("speak")) {
          updateState("speaking");
        } else if (description.includes("idle")) {
          updateState("listening");
        }
      };

      const result = await avatarSynthesizer.startAvatarAsync(peerConnection);
      console.log("startAvatarAsync result:", result);

      avatarRef.current = avatarSynthesizer;
      peerRef.current = peerConnection;
      setConnected(true);
      updateState("listening");
    } catch (err) {
      console.error("Avatar connect error:", err);
      setConnected(false);
      updateState("error");
      setError(err instanceof Error ? err.message : "Failed to connect avatar");
    }
  }

  async function disconnectAvatar() {
    try {
      if (avatarRef.current?.stopAvatarAsync) {
        await avatarRef.current.stopAvatarAsync();
      }

      avatarRef.current = null;

      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream | null;
        stream?.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      setConnected(false);
      updateState("idle");
    } catch (err) {
      console.error("Avatar disconnect error:", err);
      setError(err instanceof Error ? err.message : "Failed to disconnect avatar");
      updateState("error");
    }
  }

  async function speakDemo() {
    if (!avatarRef.current) return;

    try {
      updateState("speaking");

      const text =
        locale === "zh"
          ? "你好，我是你的面试官。请先做一个简短的自我介绍。"
          : locale === "ms"
          ? "Hai, saya penemuduga anda. Sila mulakan dengan memperkenalkan diri anda."
          : locale === "ta"
          ? "வணக்கம், நான் உங்கள் நேர்காணல் முகவர். முதலில் உங்களைச் சுருக்கமாக அறிமுகப்படுத்துங்கள்."
          : "Hello, I am your interviewer. Please begin by introducing yourself.";

      const result = await avatarRef.current.speakTextAsync(text);
      console.log("speakTextAsync result:", result);

      updateState("listening");
    } catch (err) {
      console.error("Avatar speak error:", err);
      setError(err instanceof Error ? err.message : "Failed to speak");
      updateState("error");
    }
  }

  useEffect(() => {
    return () => {
      avatarRef.current?.stopAvatarAsync?.().catch(() => {});
      peerRef.current?.close();
    };
  }, []);

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline />
        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-300 bg-white text-4xl">
                🎙️
              </div>
              <p className="text-lg font-semibold text-slate-800">Azure Avatar Stage</p>
              <p className="mt-2 text-sm text-slate-500">
                Click Connect Avatar to start the interviewer.
              </p>
            </div>
          </div>
        )}

        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
          {agentState}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={connectAvatar}
          disabled={connected}
          className="rounded-xl bg-navy-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Connect Avatar
        </button>

        <button
          type="button"
          onClick={speakDemo}
          disabled={!connected}
          className="rounded-xl bg-[#b88a44] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Demo Speak
        </button>

        <button
          type="button"
          onClick={disconnectAvatar}
          disabled={!connected}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}