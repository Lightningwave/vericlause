import { Font } from "@react-pdf/renderer";

/** Simplified Chinese + Latin; bundled subset from @fontsource (served via unpkg for stable CORS). */
const NOTO_SANS_SC_SRC =
  "https://unpkg.com/@fontsource/noto-sans-sc@5.0.0/files/noto-sans-sc-chinese-simplified-400-normal.woff2";

let registered = false;

export function registerResumePdfFonts(): void {
  if (registered) return;
  Font.register({
    family: "NotoSansSC",
    src: NOTO_SANS_SC_SRC,
  });
  registered = true;
}
