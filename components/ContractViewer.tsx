"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ClauseLocation } from "@/lib/types";
import "@llamaindex/pdf-viewer/index.css";

const PDFViewer = dynamic(
  () => import("@llamaindex/pdf-viewer").then((m) => m.PDFViewer),
  { ssr: false },
);

const PdfFocusProvider = dynamic(
  () => import("@llamaindex/pdf-viewer").then((m) => m.PdfFocusProvider),
  { ssr: false },
);

const FILE_ID = "uploaded-contract";
const HIGHLIGHT_POLL_MS = 500;
const HIGHLIGHT_MAX_POLLS = 20;

interface ContractViewerProps {
  file: File;
  highlightText?: string | null;
  highlightLocations?: ClauseLocation[] | null;
}

export function ContractViewer({
  file,
  highlightText,
  highlightLocations,
}: ContractViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clearHighlights = useCallback(() => {
    if (!containerRef.current) return;
    const highlighted = containerRef.current.querySelectorAll(
      ".vericlause-highlight",
    );
    highlighted.forEach((el) => {
      const parent = el.parentElement;
      if (parent) {
        parent.replaceChild(
          document.createTextNode(el.textContent ?? ""),
          el,
        );
        parent.normalize();
      }
    });
  }, []);

  useEffect(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    clearHighlights();

    if (!containerRef.current || !highlightText) return;

    const targetPage =
      highlightLocations?.[0]?.page_number ?? null;

    let cancelled = false;
    let pollCount = 0;

    function scrollToTargetPage() {
      if (!containerRef.current || !targetPage) return;

      const scrollContainer = containerRef.current.querySelector(
        '[class*="pdfDocument"]',
      )?.parentElement;

      if (!scrollContainer) return;

      const pages = containerRef.current.querySelectorAll(
        "[data-page-number]",
      );

      for (const page of pages) {
        const num = parseInt(
          (page as HTMLElement).dataset.pageNumber ?? "0",
          10,
        );
        if (num === targetPage) {
          page.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }

      const listContainer = containerRef.current.querySelector(
        '[style*="overflow"]',
      ) as HTMLElement | null;
      if (listContainer) {
        const pageElements = containerRef.current.querySelectorAll(
          "[data-page-number]",
        );
        if (pageElements.length > 0) {
          const first = pageElements[0] as HTMLElement;
          const pageHeight = first.offsetHeight + 20;
          listContainer.scrollTop = (targetPage - 1) * pageHeight;
        }
      }
    }

    function tryHighlight() {
      if (cancelled || !containerRef.current || !highlightText) return;

      pollCount++;
      if (pollCount > HIGHLIGHT_MAX_POLLS) return;

      const pageSelector = targetPage
        ? `div[data-page-number='${targetPage}']`
        : null;

      let spans: NodeListOf<Element>;
      if (pageSelector) {
        spans = containerRef.current.querySelectorAll(
          `${pageSelector} .react-pdf__Page__textContent.textLayer span`,
        );
        if (spans.length === 0) {
          spans = containerRef.current.querySelectorAll(
            `${pageSelector} .textLayer span`,
          );
        }
      } else {
        spans = containerRef.current.querySelectorAll(
          ".react-pdf__Page__textContent.textLayer span, .textLayer span",
        );
      }

      if (spans.length === 0) {
        setTimeout(tryHighlight, HIGHLIGHT_POLL_MS);
        return;
      }

      const normalizedNeedle = normalizeText(highlightText);

      const entries: { el: HTMLElement; text: string }[] = [];
      let concatenated = "";

      spans.forEach((span) => {
        const el = span as HTMLElement;
        const raw = el.textContent ?? "";
        if (!raw.trim()) return;
        entries.push({ el, text: raw });
        concatenated += normalizeText(raw) + " ";
      });

      concatenated = concatenated.trimEnd();
      if (!concatenated) {
        setTimeout(tryHighlight, HIGHLIGHT_POLL_MS);
        return;
      }

      const matchRange = fuzzyFind(concatenated, normalizedNeedle);
      if (!matchRange) {
        if (!targetPage) {
          setTimeout(tryHighlight, HIGHLIGHT_POLL_MS);
        }
        return;
      }

      let offset = 0;
      let firstHighlighted: HTMLElement | null = null;

      for (const entry of entries) {
        const normChunk = normalizeText(entry.text);
        const chunkStart = offset;
        const chunkEnd = offset + normChunk.length;
        offset = chunkEnd + 1;

        if (chunkStart < matchRange.end && chunkEnd > matchRange.start) {
          wrapHighlight(entry.el);
          if (!firstHighlighted) firstHighlighted = entry.el;
        }
      }

      if (firstHighlighted) {
        firstHighlighted.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }

    if (targetPage) {
      scrollToTargetPage();
      setTimeout(tryHighlight, 800);
    } else {
      setTimeout(tryHighlight, 400);
    }

    cleanupRef.current = () => {
      cancelled = true;
    };

    return () => {
      cancelled = true;
    };
  }, [highlightText, highlightLocations, clearHighlights]);

  if (!fileUrl) return null;

  const pdfFile = { id: FILE_ID, url: fileUrl };

  return (
    <div ref={containerRef} className="h-full">
      <PdfFocusProvider>
        <PDFViewer
          file={pdfFile}
          containerClassName="h-full rounded-lg border border-slate-200 bg-white overflow-auto"
        />
      </PdfFocusProvider>
    </div>
  );
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapHighlight(el: HTMLElement) {
  const text = el.textContent ?? "";
  if (!text.trim()) return;

  const wrapper = document.createElement("span");
  wrapper.className = "vericlause-highlight";
  wrapper.style.backgroundColor = "rgba(250, 204, 21, 0.45)";
  wrapper.style.borderBottom = "2px solid rgba(234, 179, 8, 0.8)";
  wrapper.style.borderRadius = "1px";
  wrapper.style.padding = "1px 0";
  wrapper.textContent = text;

  el.textContent = "";
  el.appendChild(wrapper);
}

function fuzzyFind(
  haystack: string,
  needle: string,
): { start: number; end: number } | null {
  const exact = haystack.indexOf(needle);
  if (exact !== -1) return { start: exact, end: exact + needle.length };

  const words = needle.split(/\s+/).filter(Boolean);
  if (words.length < 3) return null;

  for (const ratio of [1.0, 0.75, 0.5, 0.35]) {
    const winSize = Math.ceil(words.length * ratio);
    const prefix = words.slice(0, winSize).join(" ");
    const idx = haystack.indexOf(prefix);
    if (idx === -1) continue;

    const suffix = words.slice(-winSize).join(" ");
    const suffixIdx = haystack.indexOf(suffix, idx);
    if (suffixIdx !== -1) {
      return { start: idx, end: suffixIdx + suffix.length };
    }
    return {
      start: idx,
      end: Math.min(idx + needle.length, haystack.length),
    };
  }

  if (words.length >= 6) {
    const prefix = words.slice(0, 8).join(" ");
    const idx = haystack.indexOf(prefix);
    if (idx !== -1) {
      return {
        start: idx,
        end: Math.min(idx + needle.length, haystack.length),
      };
    }
  }

  return null;
}
