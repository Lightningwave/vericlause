export const runtime = "nodejs";

import { NextResponse } from "next/server";

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
