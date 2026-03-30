import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, insertResume, listResumes } from "@/lib/services/db";
import { parseDocument } from "@/lib/services/pdf";
import { redactPii } from "@/lib/services/redact";
import { executeProfilingForResume } from "@/lib/services/resumeProfiling";
import { createClient } from "@/lib/supabase/server";
import { assertUploadSize, maxUploadBytes } from "@/lib/api/limits";
import { allowRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  if (!allowRateLimit(user.id, "upload")) {
    return rateLimitedResponse(120);
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  const maxBytes = maxUploadBytes();
  const tooLarge = assertUploadSize(file, maxBytes);
  if (tooLarge) {
    return tooLarge;
  }

  const name = (file as File).name ?? "";
  const isPdf = name.toLowerCase().endsWith(".pdf");
  const isDocx = name.toLowerCase().endsWith(".docx");

  if (!isPdf && !isDocx) {
    return NextResponse.json({ detail: "Only PDF or DOCX files are accepted" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawText = "";
  let images: string[] = [];

  try {
    const parsed = await parseDocument(buffer, name);
    rawText = redactPii(parsed.text);
    images = parsed.images ?? [];
  } catch (e) {
    return NextResponse.json(
      { detail: `File could not be read: ${e instanceof Error ? e.message : e}` },
      { status: 422 },
    );
  }

  if (!rawText.trim()) {
    return NextResponse.json({ detail: "Document produced no text" }, { status: 422 });
  }

  let filePath: string | undefined;
  try {
    const supabase = createClient();
    const path = `${user.id}/${Date.now()}-${name}`;
    const { error } = await supabase.storage.from("resumes").upload(path, buffer, {
      contentType: isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });
    if (!error) {
      filePath = path;
    }
  } catch (err) {
    console.warn("Could not upload resume to storage", err);
  }

  const resume = await insertResume(user.id, name, rawText, null, filePath, images);

  let profiling: Awaited<ReturnType<typeof executeProfilingForResume>> | null = null;
  let profiling_error: string | null = null;
  try {
    profiling = await executeProfilingForResume(resume.id, user.id);
  } catch (e) {
    profiling_error = e instanceof Error ? e.message : "Profiling failed to start";
    console.error("Resume profiling after upload failed:", e);
  }

  if (profiling?.status === "succeeded") {
    return NextResponse.json({
      resume_id: resume.id,
      raw_text_length: rawText.length,
      job_id: profiling.job_id,
      status: "succeeded" as const,
      profile: profiling.profile,
      suggestions: profiling.suggestions,
    });
  }

  if (profiling?.status === "running") {
    return NextResponse.json({
      resume_id: resume.id,
      raw_text_length: rawText.length,
      job_id: profiling.job_id,
      status: "running" as const,
    });
  }

  return NextResponse.json({
    resume_id: resume.id,
    raw_text_length: rawText.length,
    ...(profiling_error ? { profiling_error } : {}),
  });
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const resumes = await listResumes(user.id);
  return NextResponse.json({ resumes });
}
