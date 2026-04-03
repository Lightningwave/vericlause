"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteNavbar } from "@/components/layout/SiteNavbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { useConversation } from "@11labs/react";
import { useLanguage } from "@/components/providers/language-provider";
import { usePlan } from "@/hooks/use-plan";
import type { InterviewScoreResult } from "@/lib/types";

type SessionConfigPayload = {
  agent_id: string;
  dynamic_instructions: string;
  first_message: string;
  practice_guide?: string | null;
  job_metadata?: {
    title: string | null;
    company: string | null;
  };
};

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
    difficultyHint:
      "Hard asks for more specifics and trade-offs; easy is gentler and includes example angles you can borrow from.",
    pickGuide:
      "How to choose: Alex asks direct, technical, problem-solving questions. Sophia asks warm behavioral questions focused on leadership, collaboration, and motivation.",
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
      "5-minute practice timer · Allow microphone when prompted",
    notEnough:
      "Not enough conversation to score yet. Try one full answer and end again.",
    createResume: "Create or Upload Resume",
    practiceGuideTitle: "Your prep guide",
    practiceGuideSubtitle:
      "Built from your resume and the same practice questions this session will use (Easy or Medium). Easy adds gentler guidance plus short example phrases you can adapt—not only prompts. Read before you start. Hard mode skips this so the run stays challenging.",
    practiceGuideLoading: "Generating your prep guide…",
    practiceGuideError: "Could not load prep guide.",
    practiceGuideRetry: "Try again",
    prepStudyEyebrow: "Before you connect",
    prepStudyTitle: "Interactive prep",
    prepStudyHint:
      "Pick a host, then tap Generate prep (calls our AI once). Open each topic and check every box — only then you can start practice with that host.",
    prepHostTabAlex: "Alex · hiring manager style",
    prepHostTabSophia: "Sophia · behavioural style",
    prepTopicProgress: "{open} of {total} topics opened",
    prepChecklistHint: "Tap when you’ve thought it through:",
    prepExpandAll: "Expand all",
    prepCollapseAll: "Collapse all",
    prepNextTopic: "Next topic",
    prepGenerateCta: "Generate prep guide",
    prepGenerateHint:
      "Uses your resume and this host’s practice questions. You choose when it runs.",
    prepLockedCardHint:
      "Generate prep for this host and tick every checklist item first.",
  },
  zh: {
    badge: "面试练习",
    title: "选择你的面试官",
    subtitle:
      "选择适合你练习方式的风格。每位主持人都有不同的提问重点和风格，但都会基于你的简历进行提问。",
    difficultyHint:
      "困难难度更会追问细节与取舍；简单难度更温和，并附有可参考的示例角度或例句。",
    pickGuide:
      "如何选择：选择 Alex 获取更直接的技术与问题解决类问题；选择 Sophia 获取更温暖的行为面试问题，重点在领导力、协作与动机。",
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
    footerHint: "5 分钟练习计时器 · 出现提示时请允许麦克风权限",
    notEnough:
      "当前对话内容不足以评分。请至少完成一次完整回答后再结束。",
    createResume: "创建或上传简历",
    practiceGuideTitle: "备考指南",
    practiceGuideSubtitle:
      "根据你的简历与本场将使用的练习题生成（简单或中等难度）。简单难度除引导外还会给可改编的短例句/示例角度。开始前请先阅读。困难模式不提供预览，以保持挑战性。",
    practiceGuideLoading: "正在生成备考指南…",
    practiceGuideError: "无法加载备考指南。",
    practiceGuideRetry: "重试",
    prepStudyEyebrow: "连接前",
    prepStudyTitle: "互动备考",
    prepStudyHint:
      "先选主持人，再点「生成备考」。展开各主题并勾选全部清单项后，才能与该主持人开始练习。",
    prepHostTabAlex: "Alex · 招聘经理风格",
    prepHostTabSophia: "Sophia · 行为面试风格",
    prepTopicProgress: "已打开 {open} / {total} 个主题",
    prepChecklistHint: "思考过了即可点选：",
    prepExpandAll: "全部展开",
    prepCollapseAll: "全部收起",
    prepNextTopic: "下一主题",
    prepGenerateCta: "生成备考指南",
    prepGenerateHint: "根据简历与该主持人的练习题生成；由您点击后开始。",
    prepLockedCardHint: "请先生成该主持人的备考并勾选全部清单项。",
  },
  ms: {
    badge: "Latihan temu duga",
    title: "Pilih penemu duga anda",
    subtitle:
      "Pilih gaya yang paling sesuai dengan cara anda mahu berlatih. Setiap hos mempunyai fokus dan gaya soalan yang berbeza — kedua-duanya menggunakan resume anda sebagai konteks.",
    difficultyHint:
      "Sukar menuntut lebih banyak butiran dan pertimbangan; Mudah lebih lembut dan menyertakan contoh sudut atau frasa untuk dijadikan rujukan.",
    pickGuide:
      "Cara memilih: Pilih Alex untuk soalan teknikal dan penyelesaian masalah secara langsung. Pilih Sophia untuk soalan tingkah laku yang mesra, fokus pada kepimpinan, kerjasama dan motivasi.",
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
    footerHint: "Pemasa latihan 5 minit · Benarkan mikrofon apabila diminta",
    notEnough:
      "Perbualan belum cukup untuk dinilai. Cuba beri satu jawapan penuh dan tamatkan semula.",
    createResume: "Cipta atau muat naik resume",
    practiceGuideTitle: "Panduan persediaan anda",
    practiceGuideSubtitle:
      "Dihasilkan daripada resume anda dan soalan latihan yang sama untuk sesi ini (Mudah atau Sederhana). Mudah bukan sahaja lebih terpandu—juga menyertakan contoh frasa pendek untuk disesuaikan. Baca sebelum mula. Mod sukar tidak menunjukkan pratonton supaya cabaran kekal.",
    practiceGuideLoading: "Menjana panduan persediaan anda…",
    practiceGuideError: "Tidak dapat memuatkan panduan persediaan.",
    practiceGuideRetry: "Cuba lagi",
    prepStudyEyebrow: "Sebelum sambung",
    prepStudyTitle: "Persediaan interaktif",
    prepStudyHint:
      "Pilih hos, kemudian ketik Jana panduan. Buka setiap topik dan tanda semua item senarai — barulah anda boleh mula berlatih dengan hos itu.",
    prepHostTabAlex: "Alex · gaya pengurus",
    prepHostTabSophia: "Sophia · gaya tingkah laku",
    prepTopicProgress: "{open} daripada {total} topik dibuka",
    prepChecklistHint: "Tik apabila anda sudah fikirkan:",
    prepExpandAll: "Kembangkan semua",
    prepCollapseAll: "Runtuhkan semua",
    prepNextTopic: "Topik seterusnya",
    prepGenerateCta: "Jana panduan persediaan",
    prepGenerateHint:
      "Gunakan resume dan soalan latihan hos ini. Anda yang mulakan.",
    prepLockedCardHint:
      "Jana panduan untuk hos ini dan tanda semua item senarai dahulu.",
  },
  ta: {
    badge: "நேர்முகப் பயிற்சி",
    title: "உங்கள் நேர்முக அதிகாரியைத் தேர்வு செய்யுங்கள்",
    subtitle:
      "நீங்கள் எப்படிப் பயிற்சி செய்ய விரும்புகிறீர்களோ அதற்கேற்ற முறையைத் தேர்ந்தெடுக்கவும். ஒவ்வொரு ஹோஸ்டும் வேறுபட்ட கேள்வி முறை மற்றும் கவனத்தை கொண்டிருப்பார் — இருவரும் உங்கள் ரெஸ்யூமேயை அடிப்படையாகக் கொள்வார்கள்.",
    difficultyHint:
      "கடினம்: மேலும் விவரங்கள் மற்றும் சமரசங்களை கோரும். எளிது: மென்மையானது; நீங்கள் எடுத்துக்கொள்ளக்கூடிய உதாரணக் கோணங்கள்/வரிகள் உள்ளன.",
    pickGuide:
      "எப்படி தேர்வு செய்வது: Alex நேரடியாக தொழில்நுட்பம் மற்றும் பிரச்சினைத் தீர்வு கேள்விகள் கேட்கும். Sophia நட்பு/நடத்தை சார்ந்த கேள்விகள் கேட்கும்; கவனம் தலைமை, ஒத்துழைப்பு மற்றும் ஊக்கம் மீது.",
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
      "5 நிமிடப் பயிற்சி டைமர் · கேட்கப்பட்டால் மைக்ரோஃபோனுக்கு அனுமதி வழங்கவும்",
    notEnough:
      "மதிப்பிட உரையாடல் போதவில்லை. ஒரு முழு பதிலை வழங்கி மீண்டும் முடிக்கவும்.",
    createResume: "ரெஸ்யூமே உருவாக்க அல்லது பதிவேற்றம் செய்யவும்",
    practiceGuideTitle: "உங்கள் தயாரிப்பு வழிகாட்டி",
    practiceGuideSubtitle:
      "உங்கள் ரெஸ்யூமே மற்றும் இந்த அமர்வில் பயன்படுத்தப்படும் பயிற்சிக் கேள்விகள் அடிப்படையில் (எளிது அல்லது நடுத்தரம்). எளிது: வழிநடத்துதலுடன் சேர்த்து நீங்கள் மாற்றிக்கொள்ளக்கூடிய குறுகிய உதாரண வரிகளும். தொடங்குவதற்கு முன் படிக்கவும். கடின முறையில் முன்னறிவிப்பு இல்லை.",
    practiceGuideLoading: "தயாரிப்பு வழிகாட்டி உருவாகிறது…",
    practiceGuideError: "வழிகாட்டியை ஏற்ற முடியவில்லை.",
    practiceGuideRetry: "மீண்டும் முயல்க",
    prepStudyEyebrow: "இணைப்பதற்கு முன்",
    prepStudyTitle: "ஊடாடும் தயாரிப்பு",
    prepStudyHint:
      "ஹோஸ்டைத் தேர்ந்து «தயாரிப்பை உருவாக்கு» என்பதை அழுத்தவும். ஒவ்வொரு தலைப்பையும் திறந்து பட்டியலில் அனைத்தையும் குறியிட்ட பிறகே அந்த ஹோஸ்டுடன் பயிற்சி தொடங்கலாம்.",
    prepHostTabAlex: "Alex · மேலாளர் பாணி",
    prepHostTabSophia: "Sophia · நடத்தைப் பாணி",
    prepTopicProgress: "{total} இல் {open} தலைப்புகள் திறக்கப்பட்டன",
    prepChecklistHint: "சிந்தித்த பின் தட்டவும்:",
    prepExpandAll: "அனைத்தையும் விரிவாக்கு",
    prepCollapseAll: "அனைத்தையும் சுருக்கு",
    prepNextTopic: "அடுத்த தலைப்பு",
    prepGenerateCta: "தயாரிப்பு வழிகாட்டியை உருவாக்கு",
    prepGenerateHint:
      "உங்கள் ரெஸ்யூமே மற்றும் இந்த ஹோஸ்டின் பயிற்சிக் கேள்விகளைப் பயன்படுத்தும். நீங்கள் தான் தொடங்குவீர்கள்.",
    prepLockedCardHint:
      "இந்த ஹோஸ்டுக்குத் தயாரிப்பை உருவாக்கி பட்டியலில் எல்லாவற்றையும் குறியிடவும்.",
  },
} as const;

function normalizeGuideForParsing(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^###+\s+/gm, "## ")
    .trim();
}

function parsePracticeGuideSections(text: string): { title: string | null; body: string }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const chunks = trimmed.split(/\n(?=## )/).map((c) => c.trim()).filter(Boolean);
  return chunks.map((chunk) => {
    if (chunk.startsWith("## ")) {
      const newline = chunk.indexOf("\n");
      const titleLine = newline === -1 ? chunk : chunk.slice(0, newline);
      const body = newline === -1 ? "" : chunk.slice(newline + 1).trim();
      return { title: titleLine.replace(/^##\s*/, "").trim(), body };
    }
    return { title: null, body: chunk };
  });
}

/** Short label for accordion (strip long parenthetical subtitles from model). */
function formatPrepAccordionTitle(title: string | null, fallback: string): string {
  if (!title) return fallback;
  const shortened = title.replace(/\s+\([^)]{8,240}\)\s*$/u, "").trim();
  return shortened.length >= 6 ? shortened : title;
}

function renderInlineBold(text: string, keyBase: string): ReactNode {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((seg, i) => {
    const inner = seg.match(/^\*\*([^*]+)\*\*$/);
    if (inner) {
      return (
        <strong
          key={`${keyBase}-em${i}`}
          className="font-semibold text-navy-950"
        >
          {inner[1]}
        </strong>
      );
    }
    return <span key={`${keyBase}-tx${i}`}>{seg}</span>;
  });
}

/** Renders markdown-lite bodies: **bold**, numbered lists, hyphen bullets. */
function renderPrepBody(body: string): ReactNode {
  const lines = body.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    const ordered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (ordered) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        const m = t.match(/^(\d+)[.)]\s+(.+)$/);
        if (!m) break;
        items.push(m[2]);
        i += 1;
      }
      blocks.push(
        <ol
          key={`prep-b${blockKey++}`}
          className="my-3 list-decimal space-y-2.5 pl-5 marker:font-semibold marker:text-navy-950"
        >
          {items.map((item, j) => (
            <li key={j} className="pl-1 leading-relaxed">
              {renderInlineBold(item, `ol-${j}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const bullet =
      trimmed.match(/^(\u2013|-|•)\s+(.+)$/) ?? trimmed.match(/^\*\s+(.+)$/);
    if (bullet) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        const m =
          t.match(/^(\u2013|-|•)\s+(.+)$/) ?? t.match(/^\*\s+(.+)$/);
        if (!m) break;
        items.push(m[2]);
        i += 1;
      }
      blocks.push(
        <ul
          key={`prep-b${blockKey++}`}
          className="my-3 list-disc space-y-2.5 pl-5 marker:text-[#b88a44]"
        >
          {items.map((item, j) => (
            <li key={j} className="pl-1 leading-relaxed">
              {renderInlineBold(item, `ul-${j}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length) {
      const t = lines[i];
      const tr = t.trim();
      if (!tr) break;
      if (/^(\d+)[.)]\s/.test(tr)) break;
      if (
        /^(\u2013|-|•)\s/.test(tr) ||
        (/^\*\s/.test(tr) && !/^\*\*/.test(tr))
      ) {
        break;
      }
      paraLines.push(tr);
      i += 1;
    }
    for (let pi = 0; pi < paraLines.length; pi += 1) {
      const pl = paraLines[pi];
      const bk = blockKey++;
      blocks.push(
        <p
          key={`prep-b${bk}`}
          className="my-2.5 text-[15px] leading-relaxed first:mt-0 last:mb-0 text-slate-700"
        >
          {renderInlineBold(pl, `p-${bk}-${pi}`)}
        </p>,
      );
    }
  }

  return <div className="prep-guide-body text-sm">{blocks}</div>;
}

function isChecklistSection(title: string | null): boolean {
  if (!title) return false;
  return /checklist|清单|チェック|senarai|பட்டியல்/i.test(title);
}

function normalizeChecklistItemText(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^\s*✓\s*/u, "");
  s = s.replace(/\*\*([^*]+)\*\*\s*:?\s*/g, "$1: ");
  s = s.replace(/\*\*/g, "");
  return s.replace(/\s+/g, " ").trim();
}

function extractChecklistItems(body: string): string[] {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^tap when/i.test(l));

  const bulletPattern = /^(\u2013|\u2014|-|•)\s+/;
  const fromHyphen = lines
    .filter((l) => bulletPattern.test(l))
    .map((l) => normalizeChecklistItemText(l.replace(bulletPattern, "")))
    .filter(Boolean);

  if (fromHyphen.length > 0) return fromHyphen;

  const looseBullet = /^(\u2013|\u2014|-|•|\*)\s+(?!\*)/;
  const fromLoose = lines
    .filter((l) => looseBullet.test(l))
    .map((l) => normalizeChecklistItemText(l.replace(looseBullet, "")))
    .filter(Boolean);
  if (fromLoose.length > 0) return fromLoose;

  const fallback = lines
    .map((l) => normalizeChecklistItemText(l))
    .filter((l) => l.length > 12 && !/^final checklist/i.test(l));
  return fallback.length > 0 ? fallback : body.trim() ? [normalizeChecklistItemText(body)] : [];
}

type PrepStudyCopy = {
  prepStudyEyebrow: string;
  prepStudyTitle: string;
  prepStudyHint: string;
  prepHostTabAlex: string;
  prepHostTabSophia: string;
  prepTopicProgress: string;
  prepChecklistHint: string;
  prepExpandAll: string;
  prepCollapseAll: string;
  prepNextTopic: string;
  practiceGuideLoading: string;
  practiceGuideError: string;
  practiceGuideRetry: string;
  prepGenerateCta: string;
  prepGenerateHint: string;
  prepLockedCardHint: string;
};

function InteractivePrepStudy({
  guide,
  loading,
  error,
  onRetry,
  onRequestGenerate,
  prepTabHost,
  onPrepTabChange,
  onChecklistComplete,
  studyCopy,
}: {
  guide: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRequestGenerate: () => void;
  prepTabHost: "alex" | "sophia";
  onPrepTabChange: (host: "alex" | "sophia") => void;
  onChecklistComplete: (host: "alex" | "sophia", complete: boolean) => void;
  studyCopy: PrepStudyCopy;
}) {
  const baseId = useId();
  const sections = useMemo(
    () =>
      guide
        ? parsePracticeGuideSections(normalizeGuideForParsing(guide))
        : [],
    [guide],
  );

  const topicIndices = useMemo(
    () =>
      sections
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !isChecklistSection(s.title))
        .map(({ i }) => i),
    [sections],
  );

  const [openTopics, setOpenTopics] = useState<Set<number>>(() => new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const firstTopic = topicIndices[0] ?? null;
    setOpenTopics(firstTopic !== null ? new Set([firstTopic]) : new Set());
    setCheckedItems(new Set());
  }, [guide, prepTabHost, topicIndices]);

  const openCount = useMemo(() => {
    let n = 0;
    for (const idx of topicIndices) {
      if (openTopics.has(idx)) n += 1;
    }
    return n;
  }, [topicIndices, openTopics]);

  const topicTotal = topicIndices.length;

  const toggleTopic = (i: number) => {
    setOpenTopics((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const expandAllTopics = () => {
    setOpenTopics(new Set(topicIndices));
  };

  const collapseAllTopics = () => {
    setOpenTopics(new Set());
  };

  const nextTopic = () => {
    const closed = topicIndices.filter((i) => !openTopics.has(i));
    if (closed.length > 0) {
      setOpenTopics((prev) => new Set([...prev, closed[0]]));
      return;
    }
    const idx = topicIndices[(openCount % topicTotal) || 0];
    if (idx !== undefined) {
      setOpenTopics((prev) => new Set([...prev, idx]));
    }
  };

  const checklistSection = sections.find((s) => isChecklistSection(s.title));
  const checklistItems = checklistSection
    ? extractChecklistItems(checklistSection.body)
    : [];

  useEffect(() => {
    if (!guide?.trim()) {
      onChecklistComplete(prepTabHost, false);
      return;
    }
    if (checklistItems.length === 0) {
      onChecklistComplete(prepTabHost, true);
      return;
    }
    onChecklistComplete(
      prepTabHost,
      checkedItems.size >= checklistItems.length,
    );
  }, [
    guide,
    prepTabHost,
    checklistItems.length,
    checkedItems,
    onChecklistComplete,
  ]);

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section
      className="mb-10 rounded-2xl border border-[#d8c5a2]/70 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-md sm:p-6"
      aria-label={studyCopy.prepStudyTitle}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b88a44]">
        {studyCopy.prepStudyEyebrow}
      </p>
      <h2 className="mt-2 font-serif text-2xl font-bold text-navy-950">
        {studyCopy.prepStudyTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {studyCopy.prepStudyHint}
      </p>

      <div
        className="mt-5 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Interviewer prep style"
      >
        <button
          type="button"
          role="tab"
          aria-selected={prepTabHost === "alex"}
          onClick={() => onPrepTabChange("alex")}
          className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
            prepTabHost === "alex"
              ? "border-navy-950 bg-navy-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
          }`}
        >
          {studyCopy.prepHostTabAlex}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={prepTabHost === "sophia"}
          onClick={() => onPrepTabChange("sophia")}
          className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
            prepTabHost === "sophia"
              ? "border-navy-950 bg-navy-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
          }`}
        >
          {studyCopy.prepHostTabSophia}
        </button>
      </div>

      {topicTotal > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-medium text-navy-950">
            {studyCopy.prepTopicProgress
              .replace("{open}", String(openCount))
              .replace("{total}", String(topicTotal))}
          </span>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={expandAllTopics}
            className="font-semibold text-[#b88a44] hover:underline"
          >
            {studyCopy.prepExpandAll}
          </button>
          <button
            type="button"
            onClick={collapseAllTopics}
            className="font-semibold text-slate-500 hover:text-navy-950 hover:underline"
          >
            {studyCopy.prepCollapseAll}
          </button>
          <button
            type="button"
            onClick={nextTopic}
            className="font-semibold text-navy-950 hover:underline"
          >
            {studyCopy.prepNextTopic}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">
          {studyCopy.practiceGuideLoading}
        </p>
      ) : error ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="text-sm text-rose-600">{studyCopy.practiceGuideError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy-950 hover:bg-slate-50"
          >
            {studyCopy.practiceGuideRetry}
          </button>
        </div>
      ) : !guide ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
          <p className="text-sm text-slate-600">{studyCopy.prepGenerateHint}</p>
          <button
            type="button"
            onClick={onRequestGenerate}
            disabled={loading}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-navy-950 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
          >
            {studyCopy.prepGenerateCta}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {sections.map((section, i) => {
            if (isChecklistSection(section.title)) return null;
            const panelId = `${baseId}-panel-${i}`;
            const headerId = `${baseId}-hdr-${i}`;
            const isOpen = openTopics.has(i);
            return (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  id={headerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleTopic(i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-navy-950">
                    {formatPrepAccordionTitle(
                      section.title,
                      `Section ${i + 1}`,
                    )}
                  </span>
                  <span
                    className={`shrink-0 text-[#b88a44] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                {isOpen ? (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    className="border-t border-slate-100 px-4 py-3.5 text-slate-800"
                  >
                    {renderPrepBody(section.body)}
                  </div>
                ) : null}
              </div>
            );
          })}

          {checklistSection && checklistItems.length > 0 ? (
            <div className="rounded-xl border border-[#d8c5a2]/80 bg-[#faf8f4] p-4">
              <p className="text-sm font-semibold text-navy-950">
                {formatPrepAccordionTitle(
                  checklistSection.title,
                  "Checklist",
                )}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {studyCopy.prepChecklistHint}
              </p>
              <ul className="mt-3 space-y-2">
                {checklistItems.map((item, j) => {
                  const k = `${prepTabHost}-${j}-${item.slice(0, 24)}`;
                  const done = checkedItems.has(k);
                  return (
                    <li key={k}>
                      <button
                        type="button"
                        onClick={() => toggleCheck(k)}
                        className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          done
                            ? "border-emerald-200 bg-emerald-50/80 text-slate-600 line-through"
                            : "border-slate-200 bg-white text-slate-800 hover:border-[#b88a44]/50"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-[11px] font-bold ${
                            done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 text-transparent"
                          }`}
                          aria-hidden
                        >
                          ✓
                        </span>
                        <span>{item}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] text-slate-500">
                {checkedItems.size}/{checklistItems.length} done
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const resumeId = searchParams.get("resume_id");
  const { hasFeature, loading: planLoading } = usePlan();
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
  const [timeLeft, setTimeLeft] = useState(300);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
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

  const [sessionPrep, setSessionPrep] = useState<{
    key: string;
    data: SessionConfigPayload;
  } | null>(null);
  const [sessionPrepLoading, setSessionPrepLoading] = useState(false);
  const [sessionPrepError, setSessionPrepError] = useState<string | null>(null);
  const [sessionPrepRetry, setSessionPrepRetry] = useState(0);

  const [prepPreviewHost, setPrepPreviewHost] = useState<"alex" | "sophia">(
    "alex",
  );
  const [pickerSessionCache, setPickerSessionCache] = useState<
    Partial<Record<"alex" | "sophia", SessionConfigPayload>>
  >({});
  const [pickerPrepLoadingHost, setPickerPrepLoadingHost] = useState<
    "alex" | "sophia" | null
  >(null);
  const [pickerPrepError, setPickerPrepError] = useState<string | null>(null);
  const [prepChecklistDone, setPrepChecklistDone] = useState<
    Partial<Record<"alex" | "sophia", boolean>>
  >({});
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const handlePrepChecklist = useCallback(
    (host: "alex" | "sophia", complete: boolean) => {
      setPrepChecklistDone((prev) => {
        if (prev[host] === complete) return prev;
        return { ...prev, [host]: complete };
      });
    },
    [],
  );

  const onPrepPreviewTabChange = useCallback((host: "alex" | "sophia") => {
    setPrepPreviewHost(host);
    setPickerPrepError(null);
  }, []);

  const loadPrepForHost = useCallback(
    (host: "alex" | "sophia") => {
      if (!canPractice) return;
      if (difficulty !== "easy" && difficulty !== "medium") return;

      setPickerPrepLoadingHost(host);
      setPickerPrepError(null);

      const url = new URL("/api/interviews/session", window.location.origin);
      if (resumeId) url.searchParams.set("resume_id", resumeId);
      url.searchParams.set("interviewer", host);
      url.searchParams.set("difficulty", difficulty);
      if (jobUrl.trim()) url.searchParams.set("job_url", jobUrl.trim());
      if (jobDescription.trim())
        url.searchParams.set("job_description", jobDescription.trim());

      void fetch(url.toString())
        .then(async (res) => {
          const json = (await res.json()) as { detail?: string } &
            Partial<SessionConfigPayload>;
          if (!res.ok) {
            throw new Error(json.detail || "Failed to load prep");
          }
          const data = json as SessionConfigPayload;
          setPickerSessionCache((prev) => ({ ...prev, [host]: data }));
          setPrepChecklistDone((prev) => ({ ...prev, [host]: false }));
        })
        .catch((e: unknown) => {
          setPickerPrepError(
            e instanceof Error ? e.message : "Failed to load prep",
          );
        })
        .finally(() => {
          setPickerPrepLoadingHost((h) => (h === host ? null : h));
        });
    },
    [canPractice, difficulty, resumeId],
  );

  useEffect(() => {
    setPickerSessionCache({});
    setPickerPrepError(null);
    setPrepChecklistDone({});
    setPickerPrepLoadingHost(null);
  }, [difficulty, resumeId, jobUrl, jobDescription]);

  useEffect(() => {
    if (!selectedInterviewer || !canPractice) {
      setSessionPrep(null);
      setSessionPrepError(null);
      setSessionPrepLoading(false);
      return;
    }

    const key = `${selectedInterviewer.id}|${difficulty}|${resumeId ?? ""}`;
    if (sessionPrep?.key === key && sessionPrep.data.agent_id) {
      setSessionPrepLoading(false);
      return;
    }

    let cancelled = false;
    setSessionPrepLoading(true);
    setSessionPrepError(null);

    const url = new URL("/api/interviews/session", window.location.origin);
    if (resumeId) url.searchParams.set("resume_id", resumeId);
    url.searchParams.set("interviewer", selectedInterviewer.id);
    url.searchParams.set("difficulty", difficulty);
    if (jobUrl.trim()) url.searchParams.set("job_url", jobUrl.trim());
    if (jobDescription.trim())
      url.searchParams.set("job_description", jobDescription.trim());

    void fetch(url.toString())
      .then(async (res) => {
        const json = (await res.json()) as { detail?: string } & Partial<SessionConfigPayload>;
        if (!res.ok) {
          throw new Error(json.detail || "Failed to load session");
        }
        const data = json as SessionConfigPayload;
        if (!cancelled) {
          setSessionPrep({ key, data });
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSessionPrepError(
            e instanceof Error ? e.message : "Failed to load session",
          );
          setSessionPrep(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSessionPrepLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedInterviewer?.id,
    difficulty,
    resumeId,
    canPractice,
    sessionPrepRetry,
    sessionPrep?.key,
    sessionPrep?.data.agent_id,
    jobUrl,
    jobDescription,
  ]);

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
      setTimeLeft(300);
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
      const prepKey = `${selectedInterviewer.id}|${difficulty}|${resumeId ?? ""}`;
      let data =
        sessionPrep?.key === prepKey ? sessionPrep.data : null;

      if (!data) {
        const url = new URL("/api/interviews/session", window.location.origin);
        if (resumeId) url.searchParams.set("resume_id", resumeId);
        url.searchParams.set("interviewer", selectedInterviewer.id);
        url.searchParams.set("difficulty", difficulty);
        if (jobUrl.trim()) url.searchParams.set("job_url", jobUrl.trim());
        if (jobDescription.trim())
          url.searchParams.set("job_description", jobDescription.trim());

        const res = await fetch(url.toString());
        const json = (await res.json()) as {
          detail?: string;
        } & Partial<SessionConfigPayload>;

        if (!res.ok) {
          throw new Error(json.detail || "Failed to fetch session config");
        }
        data = json as SessionConfigPayload;
        setSessionPrep({ key: prepKey, data });
      }

      setTimeLeft(300);
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
    setTimeLeft(300);
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

  const isHostPrepLocked = useCallback(
    (personId: string) => {
      if (!canPractice) return true;
      if (difficulty === "hard") return false;
      const h = personId as "alex" | "sophia";
      if (!pickerSessionCache[h]) return true;
      return prepChecklistDone[h] !== true;
    },
    [canPractice, difficulty, pickerSessionCache, prepChecklistDone],
  );

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
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {copy.pickGuide}
            </p>
          </header>

          <div className="mb-10 flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold text-slate-700">
              Difficulty
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {(
                [
                  { key: "easy", label: "Easy" },
                  { key: "medium", label: "Medium" },
                  { key: "hard", label: "Hard" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDifficulty(opt.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    difficulty === opt.key
                      ? "bg-navy-950 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500">{copy.difficultyHint}</div>
          </div>

          <div className="mb-10 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="job-url"
                  className="text-sm font-semibold text-slate-700"
                >
                  Job Posting URL (Optional)
                </label>
                <input
                  id="job-url"
                  type="url"
                  placeholder="https://www.linkedin.com/jobs/..."
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-navy-950 focus:ring-1 focus:ring-navy-950"
                />
                <p className="text-[11px] text-slate-500">
                  Paste a link from LinkedIn, MyCareersFuture, or any job board.
                </p>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="job-desc"
                  className="text-sm font-semibold text-slate-700"
                >
                  Job Description (Optional)
                </label>
                <textarea
                  id="job-desc"
                  placeholder="Paste the key requirements or JD text here..."
                  rows={1}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-navy-950 focus:ring-1 focus:ring-navy-950"
                />
                <p className="text-[11px] text-slate-500">
                  Used if URL scraping is restricted or for custom roles.
                </p>
              </div>
            </div>
          </div>

          {canPractice && (difficulty === "easy" || difficulty === "medium") ? (
            <InteractivePrepStudy
              guide={
                pickerSessionCache[prepPreviewHost]?.practice_guide?.trim()
                  ? pickerSessionCache[prepPreviewHost]!.practice_guide!
                  : null
              }
              loading={
                pickerPrepLoadingHost === prepPreviewHost &&
                !pickerSessionCache[prepPreviewHost]
              }
              error={pickerPrepError}
              onRetry={() => void loadPrepForHost(prepPreviewHost)}
              onRequestGenerate={() => void loadPrepForHost(prepPreviewHost)}
              prepTabHost={prepPreviewHost}
              onPrepTabChange={onPrepPreviewTabChange}
              onChecklistComplete={handlePrepChecklist}
              studyCopy={{
                prepStudyEyebrow: copy.prepStudyEyebrow,
                prepStudyTitle: copy.prepStudyTitle,
                prepStudyHint: copy.prepStudyHint,
                prepHostTabAlex: copy.prepHostTabAlex,
                prepHostTabSophia: copy.prepHostTabSophia,
                prepTopicProgress: copy.prepTopicProgress,
                prepChecklistHint: copy.prepChecklistHint,
                prepExpandAll: copy.prepExpandAll,
                prepCollapseAll: copy.prepCollapseAll,
                prepNextTopic: copy.prepNextTopic,
                practiceGuideLoading: copy.practiceGuideLoading,
                practiceGuideError: copy.practiceGuideError,
                practiceGuideRetry: copy.practiceGuideRetry,
                prepGenerateCta: copy.prepGenerateCta,
                prepGenerateHint: copy.prepGenerateHint,
                prepLockedCardHint: copy.prepLockedCardHint,
              }}
            />
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            {interviewers.map((person) => {
              const prepLocked = isHostPrepLocked(person.id);
              return (
              <button
                key={person.id}
                type="button"
                disabled={!canPractice || prepLocked}
                title={
                  canPractice && prepLocked
                    ? copy.prepLockedCardHint
                    : undefined
                }
                onClick={() => {
                  if (!canPractice || prepLocked) return;
                  const prepKey = `${person.id}|${difficulty}|${resumeId ?? ""}`;
                  const cached =
                    pickerSessionCache[person.id as "alex" | "sophia"];
                  if (
                    cached &&
                    (difficulty === "easy" || difficulty === "medium")
                  ) {
                    setSessionPrep({ key: prepKey, data: cached });
                  } else {
                    setSessionPrep(null);
                  }
                  setSelectedInterviewer(person);
                }}
                className={`group relative rounded-2xl border border-slate-200 bg-white p-8 text-left transition-all ${
                  !canPractice || prepLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:-translate-y-0.5 hover:border-navy-950 hover:shadow-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-950"
                }`}
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
            );
            })}
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
                setSessionPrep(null);
                setSessionPrepError(null);
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
        <div className="flex items-center gap-4">
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 sm:block">
            VeriClause
          </span>
          <div className="h-4 w-px bg-white/10" aria-hidden />
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            <span>Meeting ID: </span>
            <span className="font-mono text-white/60">
              {Math.random().toString(36).substring(2, 10).toUpperCase()}
            </span>
          </div>
        </div>
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
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                Network: Stable
              </span>
            </div>
            <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md sm:bottom-6 sm:left-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Host
              </span>
              <span className="text-xs font-semibold text-white/90">
                {selectedInterviewer?.name}
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1e2124] shadow-2xl">
            <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center p-8 sm:p-10">
              <div className="relative group flex h-36 w-36 items-center justify-center rounded-full border-[3px] border-white/10 bg-navy-950 font-serif text-4xl font-bold text-white shadow-inner sm:h-40 sm:w-40 sm:text-5xl">
                {copy.you}
                <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-[#1e2124] bg-[#b88a44] p-2 shadow-lg">
                  <svg
                    className="h-4 w-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-7 text-center">
                <h2 className="text-xl font-bold tracking-tight">{copy.you}</h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                  {sessionPrep?.data.job_metadata?.title || "Candidate"}
                </p>
                {sessionPrep?.data.job_metadata?.company && (
                  <p className="mt-1 text-[10px] font-bold text-[#b88a44]">
                    @{sessionPrep.data.job_metadata.company}
                  </p>
                )}
              </div>

              {!isInterviewing && !isIntermediate && !loading && (
                canPractice ? (
                  <>
                    {difficulty === "hard" &&
                    sessionPrepError &&
                    !sessionPrepLoading ? (
                      <div className="mt-6 max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center">
                        <p className="text-xs text-red-200/90">{sessionPrepError}</p>
                        <button
                          type="button"
                          onClick={() => setSessionPrepRetry((n) => n + 1)}
                          className="mt-2 text-xs font-semibold text-[#e8cc95] underline hover:no-underline"
                        >
                          {copy.practiceGuideRetry}
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void startInterview()}
                      className="mt-8 rounded-xl bg-[#b88a44] px-8 py-3.5 text-sm font-bold text-navy-950 shadow-lg shadow-[#b88a44]/20 transition hover:bg-[#a67a39] active:scale-[0.98]"
                    >
                      {copy.startConversation}
                    </button>
                  </>
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
            <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md sm:bottom-6 sm:left-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Participant
              </span>
              <span className="text-xs font-semibold text-white/90">
                {copy.you}
              </span>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
              <section className="w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#16191c] p-4 md:col-span-2">
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
            </div>
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