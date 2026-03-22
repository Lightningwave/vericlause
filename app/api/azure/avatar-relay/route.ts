import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/services/db";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!allowRateLimit(user.id, "azure")) {
    return rateLimitedResponse(60);
  }

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json(
      { error: "Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`,
      {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Failed to get Azure avatar relay token: ${text}` },
        { status: 500 }
      );
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown relay token error",
      },
      { status: 500 }
    );
  }
}