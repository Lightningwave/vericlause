"use client";

import { useEffect, useState } from "react";
import { TEMPLATES, type TemplateId, type ResumeTemplateData } from "@/lib/resume-templates/types";
import { recommendTemplate } from "@/lib/resume-templates/recommend";
import { downloadResume } from "@/lib/resume-templates/download";

const STORAGE_KEY = "vericlause.lastTemplate";

// Colour palette shared across all SVG previews
const C = {
  dark: "#1e293b",
  med: "#94a3b8",
  light: "#e2e8f0",
  navy: "#1e3a5f",
  gold: "#c9a84c",
  white: "#ffffff",
} as const;

function MunichPreview() {
  // Two-Column Classic: narrow left sidebar, wider right main
  return (
    <svg width="140" height="200" viewBox="0 0 140 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left column bg */}
      <rect x="0" y="0" width="50" height="200" fill="#f8fafc" />
      {/* Right column bg */}
      <rect x="50" y="0" width="90" height="200" fill={C.white} />
      {/* Vertical divider */}
      <line x1="50" y1="0" x2="50" y2="200" stroke={C.light} strokeWidth="1" />

      {/* Left — name/photo area placeholder */}
      <rect x="10" y="12" width="30" height="30" rx="15" fill={C.light} />

      {/* Left — CONTACT label */}
      <rect x="6" y="50" width="28" height="3" rx="1" fill={C.dark} />
      <rect x="6" y="57" width="36" height="2" rx="1" fill={C.med} />
      <rect x="6" y="62" width="32" height="2" rx="1" fill={C.light} />
      <rect x="6" y="67" width="30" height="2" rx="1" fill={C.light} />

      {/* Left — SKILLS label */}
      <rect x="6" y="78" width="22" height="3" rx="1" fill={C.dark} />
      <rect x="6" y="85" width="38" height="2" rx="1" fill={C.med} />
      <rect x="6" y="90" width="34" height="2" rx="1" fill={C.light} />
      <rect x="6" y="95" width="30" height="2" rx="1" fill={C.light} />
      <rect x="6" y="100" width="36" height="2" rx="1" fill={C.light} />

      {/* Left — LANGUAGES label */}
      <rect x="6" y="111" width="34" height="3" rx="1" fill={C.dark} />
      <rect x="6" y="118" width="36" height="2" rx="1" fill={C.med} />
      <rect x="6" y="123" width="28" height="2" rx="1" fill={C.light} />

      {/* Right — Name */}
      <rect x="60" y="12" width="60" height="7" rx="1.5" fill={C.dark} />
      {/* Right — Job title */}
      <rect x="60" y="23" width="44" height="4" rx="1" fill={C.med} />
      {/* Right — divider */}
      <line x1="60" y1="32" x2="130" y2="32" stroke={C.light} strokeWidth="1" />

      {/* Right — SUMMARY label */}
      <rect x="60" y="38" width="32" height="3" rx="1" fill={C.dark} />
      <rect x="60" y="45" width="68" height="2" rx="1" fill={C.med} />
      <rect x="60" y="50" width="64" height="2" rx="1" fill={C.light} />
      <rect x="60" y="55" width="52" height="2" rx="1" fill={C.light} />

      {/* Right — EXPERIENCE label */}
      <rect x="60" y="65" width="48" height="3" rx="1" fill={C.dark} />
      {/* Entry 1 */}
      <rect x="60" y="72" width="56" height="4" rx="1" fill={C.dark} />
      <rect x="60" y="79" width="40" height="2" rx="1" fill={C.med} />
      <rect x="60" y="84" width="68" height="2" rx="1" fill={C.light} />
      <rect x="60" y="89" width="62" height="2" rx="1" fill={C.light} />
      <rect x="60" y="94" width="55" height="2" rx="1" fill={C.light} />
      {/* Entry 2 */}
      <rect x="60" y="103" width="52" height="4" rx="1" fill={C.dark} />
      <rect x="60" y="110" width="36" height="2" rx="1" fill={C.med} />
      <rect x="60" y="115" width="68" height="2" rx="1" fill={C.light} />
      <rect x="60" y="120" width="60" height="2" rx="1" fill={C.light} />
      <rect x="60" y="125" width="50" height="2" rx="1" fill={C.light} />
      {/* Entry 3 */}
      <rect x="60" y="134" width="48" height="4" rx="1" fill={C.dark} />
      <rect x="60" y="141" width="34" height="2" rx="1" fill={C.med} />
      <rect x="60" y="146" width="68" height="2" rx="1" fill={C.light} />
      <rect x="60" y="151" width="56" height="2" rx="1" fill={C.light} />
    </svg>
  );
}

function TraditionalPreview() {
  // Single Column with Photo: name+photo header, thick divider, label/value rows
  return (
    <svg width="140" height="200" viewBox="0 0 140 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="140" height="200" fill={C.white} />

      {/* Header: name left, photo right */}
      <rect x="8" y="10" width="72" height="8" rx="1.5" fill={C.dark} />
      <rect x="8" y="22" width="50" height="3" rx="1" fill={C.med} />
      <rect x="8" y="28" width="60" height="2" rx="1" fill={C.light} />
      <rect x="8" y="33" width="54" height="2" rx="1" fill={C.light} />
      {/* Photo box */}
      <rect x="100" y="8" width="32" height="38" rx="2" fill={C.light} stroke={C.med} strokeWidth="1" />
      <rect x="108" y="16" width="16" height="16" rx="8" fill={C.med} />

      {/* Thick divider */}
      <rect x="8" y="52" width="124" height="4" rx="1" fill={C.dark} />

      {/* PERSONAL DATA label */}
      <rect x="8" y="62" width="48" height="3" rx="1" fill={C.dark} />
      <line x1="8" y1="67" x2="132" y2="67" stroke={C.light} strokeWidth="0.75" />
      {/* Label/value rows */}
      <rect x="8" y="71" width="28" height="2" rx="1" fill={C.dark} />
      <rect x="48" y="71" width="56" height="2" rx="1" fill={C.med} />
      <rect x="8" y="77" width="22" height="2" rx="1" fill={C.dark} />
      <rect x="48" y="77" width="64" height="2" rx="1" fill={C.med} />
      <rect x="8" y="83" width="26" height="2" rx="1" fill={C.dark} />
      <rect x="48" y="83" width="52" height="2" rx="1" fill={C.med} />

      {/* SKILLS label */}
      <rect x="8" y="94" width="28" height="3" rx="1" fill={C.dark} />
      <line x1="8" y1="99" x2="132" y2="99" stroke={C.light} strokeWidth="0.75" />
      <rect x="8" y="103" width="116" height="2" rx="1" fill={C.med} />
      <rect x="8" y="108" width="90" height="2" rx="1" fill={C.light} />

      {/* EDUCATION label */}
      <rect x="8" y="118" width="36" height="3" rx="1" fill={C.dark} />
      <line x1="8" y1="123" x2="132" y2="123" stroke={C.light} strokeWidth="0.75" />
      {/* TERTIARY row */}
      <rect x="8" y="127" width="24" height="2" rx="1" fill={C.dark} />
      <rect x="44" y="127" width="60" height="2" rx="1" fill={C.med} />
      <rect x="44" y="132" width="48" height="2" rx="1" fill={C.light} />
      <rect x="44" y="137" width="36" height="2" rx="1" fill={C.light} />

      {/* WORK EXPERIENCE label */}
      <rect x="8" y="148" width="56" height="3" rx="1" fill={C.dark} />
      <line x1="8" y1="153" x2="132" y2="153" stroke={C.light} strokeWidth="0.75" />
      <rect x="8" y="157" width="72" height="3" rx="1" fill={C.dark} />
      <rect x="8" y="163" width="44" height="2" rx="1" fill={C.med} />
      <rect x="8" y="168" width="116" height="2" rx="1" fill={C.light} />
      <rect x="8" y="173" width="100" height="2" rx="1" fill={C.light} />
      <rect x="8" y="178" width="80" height="2" rx="1" fill={C.light} />
    </svg>
  );
}

function ExecutivePreview() {
  // Single Column Dense: centered name, centered title, summary, skills grid, double-rule sections
  return (
    <svg width="140" height="200" viewBox="0 0 140 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="140" height="200" fill={C.white} />

      {/* Centered name */}
      <rect x="30" y="10" width="80" height="8" rx="1.5" fill={C.dark} />
      {/* Centered contact bar */}
      <rect x="22" y="22" width="96" height="3" rx="1" fill={C.med} />
      {/* Centered job title */}
      <rect x="38" y="29" width="64" height="4" rx="1" fill={C.dark} />

      {/* Double rule */}
      <line x1="8" y1="39" x2="132" y2="39" stroke={C.dark} strokeWidth="1.5" />
      <line x1="8" y1="42" x2="132" y2="42" stroke={C.dark} strokeWidth="0.5" />

      {/* Summary paragraph */}
      <rect x="8" y="48" width="124" height="2" rx="1" fill={C.med} />
      <rect x="8" y="53" width="118" height="2" rx="1" fill={C.light} />
      <rect x="8" y="58" width="104" height="2" rx="1" fill={C.light} />

      {/* Skills — 3-col grid */}
      <rect x="8" y="68" width="36" height="2" rx="1" fill={C.med} />
      <rect x="52" y="68" width="36" height="2" rx="1" fill={C.med} />
      <rect x="96" y="68" width="36" height="2" rx="1" fill={C.med} />
      <rect x="8" y="73" width="32" height="2" rx="1" fill={C.light} />
      <rect x="52" y="73" width="30" height="2" rx="1" fill={C.light} />
      <rect x="96" y="73" width="34" height="2" rx="1" fill={C.light} />

      {/* PROFESSIONAL EXPERIENCE section */}
      <line x1="8" y1="83" x2="132" y2="83" stroke={C.dark} strokeWidth="1" />
      <rect x="8" y="86" width="72" height="3" rx="1" fill={C.dark} />
      <line x1="8" y1="91" x2="132" y2="91" stroke={C.dark} strokeWidth="0.5" />

      {/* Entry 1 */}
      <rect x="8" y="96" width="80" height="3" rx="1" fill={C.dark} />
      <rect x="8" y="102" width="56" height="2" rx="1" fill={C.med} />
      <rect x="8" y="107" width="124" height="2" rx="1" fill={C.light} />
      <rect x="8" y="112" width="116" height="2" rx="1" fill={C.light} />
      <rect x="8" y="117" width="100" height="2" rx="1" fill={C.light} />

      {/* Entry 2 */}
      <rect x="8" y="126" width="76" height="3" rx="1" fill={C.dark} />
      <rect x="8" y="132" width="52" height="2" rx="1" fill={C.med} />
      <rect x="8" y="137" width="124" height="2" rx="1" fill={C.light} />
      <rect x="8" y="142" width="110" height="2" rx="1" fill={C.light} />
      <rect x="8" y="147" width="96" height="2" rx="1" fill={C.light} />

      {/* Entry 3 */}
      <rect x="8" y="156" width="70" height="3" rx="1" fill={C.dark} />
      <rect x="8" y="162" width="48" height="2" rx="1" fill={C.med} />
      <rect x="8" y="167" width="124" height="2" rx="1" fill={C.light} />
      <rect x="8" y="172" width="108" height="2" rx="1" fill={C.light} />
    </svg>
  );
}

function ModernMinimalPreview() {
  // Left-Label Layout: bold name, divider, rows with narrow label col + wide content col
  return (
    <svg width="140" height="200" viewBox="0 0 140 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="140" height="200" fill={C.white} />

      {/* Bold name */}
      <rect x="8" y="10" width="88" height="10" rx="1.5" fill={C.dark} />
      {/* Address */}
      <rect x="8" y="24" width="60" height="2.5" rx="1" fill={C.med} />
      {/* Contact row */}
      <rect x="8" y="30" width="44" height="2.5" rx="1" fill={C.light} />
      <rect x="58" y="30" width="50" height="2.5" rx="1" fill={C.light} />

      {/* Full-width divider */}
      <line x1="8" y1="38" x2="132" y2="38" stroke={C.med} strokeWidth="0.75" />

      {/* Row 1 — EXPERIENCE */}
      {/* Label col (25%) */}
      <rect x="8" y="46" width="22" height="3" rx="1" fill={C.dark} />
      {/* Content col */}
      <rect x="40" y="44" width="60" height="3.5" rx="1" fill={C.dark} />
      <rect x="40" y="51" width="44" height="2" rx="1" fill={C.med} />
      <rect x="40" y="56" width="88" height="2" rx="1" fill={C.light} />
      <rect x="40" y="61" width="80" height="2" rx="1" fill={C.light} />
      <rect x="40" y="66" width="72" height="2" rx="1" fill={C.light} />
      {/* — second job */}
      <rect x="40" y="74" width="56" height="3.5" rx="1" fill={C.dark} />
      <rect x="40" y="81" width="40" height="2" rx="1" fill={C.med} />
      <rect x="40" y="86" width="88" height="2" rx="1" fill={C.light} />
      <rect x="40" y="91" width="76" height="2" rx="1" fill={C.light} />

      {/* Row 2 — PROFILE */}
      <line x1="8" y1="100" x2="132" y2="100" stroke={C.light} strokeWidth="0.5" />
      <rect x="8" y="107" width="20" height="3" rx="1" fill={C.dark} />
      <rect x="40" y="105" width="88" height="2" rx="1" fill={C.med} />
      <rect x="40" y="110" width="84" height="2" rx="1" fill={C.light} />
      <rect x="40" y="115" width="76" height="2" rx="1" fill={C.light} />

      {/* Row 3 — EDUCATION */}
      <line x1="8" y1="124" x2="132" y2="124" stroke={C.light} strokeWidth="0.5" />
      <rect x="8" y="131" width="24" height="3" rx="1" fill={C.dark} />
      <rect x="40" y="129" width="68" height="3.5" rx="1" fill={C.dark} />
      <rect x="40" y="136" width="52" height="2" rx="1" fill={C.med} />
      <rect x="40" y="141" width="44" height="2" rx="1" fill={C.light} />

      {/* Row 4 — SKILLS */}
      <line x1="8" y1="150" x2="132" y2="150" stroke={C.light} strokeWidth="0.5" />
      <rect x="8" y="157" width="18" height="3" rx="1" fill={C.dark} />
      <rect x="40" y="155" width="56" height="2" rx="1" fill={C.med} />
      <rect x="40" y="160" width="48" height="2" rx="1" fill={C.light} />
      <rect x="40" y="165" width="52" height="2" rx="1" fill={C.light} />
      <rect x="40" y="170" width="44" height="2" rx="1" fill={C.light} />
    </svg>
  );
}

function NavyExecutivePreview() {
  // Dark Header + Two-Column body
  return (
    <svg width="140" height="200" viewBox="0 0 140 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Navy header */}
      <rect width="140" height="52" fill={C.navy} />
      {/* Gold name bar */}
      <rect x="28" y="16" width="84" height="8" rx="1.5" fill={C.gold} />
      {/* Light subtitle */}
      <rect x="44" y="28" width="52" height="3" rx="1" fill="#8ba3c0" />
      {/* Thin gold accent line */}
      <line x1="28" y1="38" x2="112" y2="38" stroke={C.gold} strokeWidth="0.75" />

      {/* Body bg */}
      <rect y="52" width="140" height="148" fill={C.white} />

      {/* Left column bg (35%) */}
      <rect y="52" width="50" height="148" fill="#f5f7fa" />

      {/* Vertical divider */}
      <line x1="50" y1="52" x2="50" y2="200" stroke="#dde3eb" strokeWidth="0.75" />

      {/* Left — CONTACT label */}
      <rect x="6" y="60" width="28" height="2.5" rx="1" fill={C.navy} />
      <rect x="6" y="66" width="36" height="2" rx="1" fill={C.med} />
      <rect x="6" y="71" width="32" height="2" rx="1" fill={C.light} />
      <rect x="6" y="76" width="30" height="2" rx="1" fill={C.light} />

      {/* Left — EDUCATION label */}
      <rect x="6" y="86" width="34" height="2.5" rx="1" fill={C.navy} />
      <rect x="6" y="92" width="38" height="2.5" rx="1" fill={C.dark} />
      <rect x="6" y="98" width="30" height="2" rx="1" fill={C.med} />
      <rect x="6" y="103" width="36" height="2" rx="1" fill={C.light} />
      <rect x="6" y="108" width="24" height="2" rx="1" fill={C.light} />

      {/* Left — SKILLS label */}
      <rect x="6" y="118" width="22" height="2.5" rx="1" fill={C.navy} />
      <rect x="6" y="124" width="38" height="2" rx="1" fill={C.med} />
      <rect x="6" y="129" width="34" height="2" rx="1" fill={C.light} />
      <rect x="6" y="134" width="30" height="2" rx="1" fill={C.light} />
      <rect x="6" y="139" width="36" height="2" rx="1" fill={C.light} />

      {/* Right — PROFILE label */}
      <rect x="58" y="60" width="28" height="2.5" rx="1" fill={C.navy} />
      <line x1="58" y1="65" x2="132" y2="65" stroke="#dde3eb" strokeWidth="0.5" />
      <rect x="58" y="69" width="70" height="2" rx="1" fill={C.med} />
      <rect x="58" y="74" width="66" height="2" rx="1" fill={C.light} />
      <rect x="58" y="79" width="58" height="2" rx="1" fill={C.light} />

      {/* Right — EXPERIENCE label */}
      <rect x="58" y="89" width="44" height="2.5" rx="1" fill={C.navy} />
      <line x1="58" y1="94" x2="132" y2="94" stroke="#dde3eb" strokeWidth="0.5" />
      {/* Entry 1 */}
      <rect x="58" y="98" width="50" height="2" rx="1" fill={C.med} />
      <rect x="58" y="103" width="62" height="3" rx="1" fill={C.dark} />
      <rect x="58" y="109" width="70" height="2" rx="1" fill={C.light} />
      <rect x="58" y="114" width="64" height="2" rx="1" fill={C.light} />
      <rect x="58" y="119" width="56" height="2" rx="1" fill={C.light} />
      {/* Entry 2 */}
      <rect x="58" y="128" width="46" height="2" rx="1" fill={C.med} />
      <rect x="58" y="133" width="58" height="3" rx="1" fill={C.dark} />
      <rect x="58" y="139" width="70" height="2" rx="1" fill={C.light} />
      <rect x="58" y="144" width="60" height="2" rx="1" fill={C.light} />
      <rect x="58" y="149" width="52" height="2" rx="1" fill={C.light} />
    </svg>
  );
}

const PREVIEW_MAP: Record<TemplateId, React.FC> = {
  munich: MunichPreview,
  traditional: TraditionalPreview,
  executive: ExecutivePreview,
  "modern-minimal": ModernMinimalPreview,
  "navy-executive": NavyExecutivePreview,
};

function TemplateCard({ id, isSelected, isRecommended, onClick }: {
  id: TemplateId;
  isSelected: boolean;
  isRecommended: boolean;
  onClick: () => void;
}) {
  const Preview = PREVIEW_MAP[id];
  const tpl = TEMPLATES.find((t) => t.id === id)!;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 focus:outline-none"
    >
      <div
        className={`relative overflow-hidden rounded-lg border-2 bg-white transition-all ${
          isSelected
            ? "border-slate-800 ring-2 ring-slate-800 ring-offset-1"
            : isRecommended
            ? "border-red-500 ring-2 ring-red-500 ring-offset-1"
            : "border-slate-200 hover:border-slate-400"
        }`}
        style={{ width: 140, height: 196 }}
      >
        <Preview />
        {isRecommended && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold leading-none text-white shadow">
            AI
          </span>
        )}
        {isSelected && (
          <div className="absolute inset-0 bg-slate-900/5" />
        )}
      </div>
      <span
        className={`text-center text-xs leading-tight ${
          isSelected ? "font-semibold text-slate-900" : "text-slate-500"
        }`}
      >
        {tpl.name}
      </span>
    </button>
  );
}

interface TemplatePickerModalProps {
  data: ResumeTemplateData;
  onClose: () => void;
  language?: string;
}

export function TemplatePickerModal({ data, onClose, language }: TemplatePickerModalProps) {
  const recommended = recommendTemplate(data);

  const [selected, setSelected] = useState<TemplateId>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as TemplateId | null;
      if (stored && TEMPLATES.some((t) => t.id === stored)) return stored;
    }
    return recommended;
  });

  const [format, setFormat] = useState<"pdf" | "docx">("pdf");
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleDownload() {
    setLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, selected);

      let resumeData = data;
      if (language && language !== "en") {
        setTranslating(true);
        try {
          const res = await fetch("/api/resume/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeData: data, targetLanguage: language }),
          });
          if (res.ok) {
            const json = await res.json();
            resumeData = json.translatedData ?? data;
          }
        } finally {
          setTranslating(false);
        }
      }

      await downloadResume(resumeData, selected, format);
    } finally {
      setLoading(false);
      onClose();
    }
  }

  const selectedTemplate = TEMPLATES.find((t) => t.id === selected)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Choose a Template</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* AI recommendation notice */}
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI recommends <strong className="ml-0.5">{TEMPLATES.find((t) => t.id === recommended)?.name}</strong> for your resume
        </div>

        {/* Template grid — 5 cols desktop, 3 cols smaller */}
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 mb-5">
          {TEMPLATES.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              id={tpl.id}
              isSelected={selected === tpl.id}
              isRecommended={tpl.id === recommended}
              onClick={() => setSelected(tpl.id)}
            />
          ))}
        </div>

        {/* Selected template description */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium text-slate-700">{selectedTemplate.description}</p>
          <p className="mt-0.5 text-xs text-slate-500">Best for: {selectedTemplate.bestFor}</p>
        </div>

        {/* Format toggle */}
        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setFormat("pdf")}
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
              format === "pdf"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            PDF
          </button>
          <button
            onClick={() => setFormat("docx")}
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
              format === "docx"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Word (.docx)
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {translating ? "Translating resume…" : loading ? "Generating…" : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
