import { NextRequest, NextResponse } from "next/server";

/** Default max JSON body for LLM / analysis routes (bytes). Override with MAX_JSON_BODY_BYTES. */
export function maxJsonBodyBytes(): number {
  const n = Number(process.env.MAX_JSON_BODY_BYTES);
  return Number.isFinite(n) && n > 0 ? n : 1_048_576; // 1 MiB
}

/** Max upload size for PDF/DOCX (bytes). Override with MAX_UPLOAD_BYTES. */
export function maxUploadBytes(): number {
  const n = Number(process.env.MAX_UPLOAD_BYTES);
  return Number.isFinite(n) && n > 0 ? n : 15 * 1024 * 1024; // 15 MiB
}

/**
 * Parse JSON with a hard byte cap (works even when Content-Length is missing).
 * Consumes the request body once.
 */
export async function parseJsonBody<T>(
  req: NextRequest,
  maxBytes: number,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { detail: `Request body too large (max ${maxBytes} bytes)` },
        { status: 413 },
      ),
    };
  }
  try {
    const text = new TextDecoder().decode(buf);
    const data = JSON.parse(text) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

export function assertUploadSize(
  file: Blob,
  maxBytes: number,
): NextResponse | null {
  if (file.size > maxBytes) {
    return NextResponse.json(
      { detail: `File too large (max ${Math.floor(maxBytes / (1024 * 1024))} MiB)` },
      { status: 413 },
    );
  }
  return null;
}
