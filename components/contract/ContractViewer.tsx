"use client";

interface ContractViewerProps {
  srcUrl: string;
  title?: string;
  highlightText?: string | null;
  highlightLocations?: unknown;
}

export function ContractViewer({
  srcUrl,
  title = "Contract PDF",
}: ContractViewerProps) {
  return (
    <div className="h-full w-full bg-slate-100">
      <object
        key={srcUrl}
        data={srcUrl}
        type="application/pdf"
        className="h-full w-full"
        aria-label={title}
      >
        <iframe
          src={srcUrl}
          title={title}
          className="h-full w-full border-0 bg-white"
        />
      </object>
    </div>
  );
}