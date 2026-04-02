import type { ResumeTemplateData, TemplateId } from "./types";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  
  // Append to body to ensure it's in the DOM for older browsers/stricter environments
  document.body.appendChild(a);
  a.click();
  
  // Clean up after a delay to ensure the browser has started the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export async function downloadResume(
  data: ResumeTemplateData,
  templateId: TemplateId,
  format: "pdf" | "docx",
): Promise<void> {
  const safeName = (data.name || "resume").replace(/\s+/g, "_").toLowerCase();
  const filename = `${safeName}_${templateId}.${format}`;

  if (format === "pdf") {
    const { pdf } = await import("@react-pdf/renderer");
    const { registerResumePdfFonts } = await import("./register-pdf-fonts");
    registerResumePdfFonts();

    let Component: React.ComponentType<{ data: ResumeTemplateData }>;
    switch (templateId) {
      case "munich": {
        const m = await import("./munich-pdf");
        Component = m.MunichPdf;
        break;
      }
      case "traditional": {
        const m = await import("./traditional-pdf");
        Component = m.TraditionalPdf;
        break;
      }
      case "executive": {
        const m = await import("./executive-pdf");
        Component = m.ExecutivePdf;
        break;
      }
      case "navy-executive": {
        const m = await import("./navy-executive-pdf");
        Component = m.NavyExecutivePdf;
        break;
      }
      case "modern-minimal":
      default: {
        const m = await import("./modern-minimal-pdf");
        Component = m.ModernMinimalPdf;
        break;
      }
    }

    const React = await import("react");
    const blob = await pdf(React.createElement(Component, { data }) as any).toBlob();
    triggerDownload(blob, filename);
    return;
  }

  // DOCX
  let blob: Blob;
  switch (templateId) {
    case "munich": {
      const { generateMunichDocx } = await import("./munich-docx");
      blob = await generateMunichDocx(data);
      break;
    }
    case "traditional": {
      const { generateTraditionalDocx } = await import("./traditional-docx");
      blob = await generateTraditionalDocx(data);
      break;
    }
    case "executive": {
      const { generateExecutiveDocx } = await import("./executive-docx");
      blob = await generateExecutiveDocx(data);
      break;
    }
    case "navy-executive": {
      const { generateNavyExecutiveDocx } = await import("./navy-executive-docx");
      blob = await generateNavyExecutiveDocx(data);
      break;
    }
    case "modern-minimal":
    default: {
      const { generateModernMinimalDocx } = await import("./modern-minimal-docx");
      blob = await generateModernMinimalDocx(data);
      break;
    }
  }

  triggerDownload(blob, filename);
}
