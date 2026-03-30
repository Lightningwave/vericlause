export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * GET /api/speech — Azure Speech SDK token proxy.
 *
 * TTS front-cutoff fix (applied client-side):
 * The Web Speech API SpeechSynthesis can clip the first ~200-300ms of an
 * utterance if the audio output device is still spinning up. Two mitigations
 * are used in the shared TTS helper (`lib/speech/speakText.ts`):
 *   1. `speechSynthesis.cancel()` before every new utterance to flush the
 *      queue and reset the synthesiser state.
 *   2. A 300ms silence is prepended to each utterance via SSML
 *      (`<break time="300ms"/>`) so that any clipped audio falls within the
 *      silent padding, not the actual spoken content.
 * See `lib/speech/speakText.ts` for the implementation.
 */
export async function GET() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json(
      { error: "Azure Speech credentials are not configured" },
      { status: 500 },
    );
  }

  const tokenRes = await fetch(
    `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": key },
    },
  );

  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Azure Speech token" },
      { status: 502 },
    );
  }

  const token = await tokenRes.text();
  return NextResponse.json({ token, region });
}
