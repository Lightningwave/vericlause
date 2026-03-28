export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/services/db";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ place: null }, { status: 401 });

  const query = req.nextUrl.searchParams.get("query");
  if (!query?.trim()) return NextResponse.json({ place: null });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ place: null });

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.addressComponents",
      },
      body: JSON.stringify({ textQuery: query }),
    });

    if (!res.ok) return NextResponse.json({ place: null });

    const data = (await res.json()) as {
      places?: { addressComponents?: { longText: string; types: string[] }[] }[];
    };

    const components = data.places?.[0]?.addressComponents;
    if (!components) return NextResponse.json({ place: null });

    const locality = components.find((c) => c.types.includes("locality"))?.longText;
    const country = components.find((c) => c.types.includes("country"))?.longText;
    const location = [locality, country].filter(Boolean).join(", ");

    return NextResponse.json({ place: location ? { location } : null });
  } catch {
    return NextResponse.json({ place: null });
  }
}
