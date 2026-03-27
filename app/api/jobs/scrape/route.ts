import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/services/db";
import { extractJobFromUrl } from "@/lib/services/jobRecommendation";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only http/https URLs are supported" }, { status: 400 });
    }

    const job = await extractJobFromUrl(url);

    return NextResponse.json({ job });
  } catch (err) {
    console.error("Job scrape error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to extract job details" },
      { status: 500 },
    );
  }
}