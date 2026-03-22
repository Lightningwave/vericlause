import {
  createProfilingJob,
  getResume,
  updateProfilingJob,
  updateResumeProfile,
} from "@/lib/services/db";
import { buildResumeProfile } from "@/lib/services/resume";
import type { ResumeProfile, ResumeSuggestion } from "@/lib/types";

export type ProfilingExecutionResult =
  | { status: "succeeded"; job_id: string; profile: ResumeProfile; suggestions: ResumeSuggestion[] }
  | { status: "running"; job_id: string };

/**
 * Creates a profiling_jobs row, runs buildResumeProfile, and either completes within
 * PROFILE_WAIT_MS (returns succeeded) or returns running while work continues in the background.
 * Same behavior as POST /api/resumes/profile.
 */
export async function executeProfilingForResume(
  resumeId: string,
  userId: string,
): Promise<ProfilingExecutionResult> {
  const resume = await getResume(resumeId, userId);
  if (!resume) {
    throw new Error("Resume not found");
  }

  const job = await createProfilingJob(resumeId, userId);
  await updateProfilingJob(job.id, userId, { status: "running", error: null });

  const PROFILE_WAIT_MS = Number(
    process.env.RESUME_PROFILE_WAIT_MS ?? process.env.ANALYZE_TIMEOUT_MS ?? 25000,
  );

  const profilingTask = (async () => {
    try {
      const imageUrls = Array.isArray(resume.image_urls) ? resume.image_urls : [];
      const { profile, suggestions } = await buildResumeProfile(resume.raw_text, imageUrls);

      await updateResumeProfile(resumeId, userId, profile, suggestions);

      await updateProfilingJob(job.id, userId, {
        status: "succeeded",
        error: null,
      });

      return { profile, suggestions };
    } catch (err) {
      console.error("Resume profiling background task failed:", err);
      await updateProfilingJob(job.id, userId, {
        status: "failed",
        error: err instanceof Error ? err.message : "Profiling failed",
      });
      throw err;
    }
  })();

  const result = await Promise.race([
    profilingTask,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), PROFILE_WAIT_MS)),
  ]).catch((err: unknown) => {
    throw err;
  });

  if (result === null) {
    return { status: "running", job_id: job.id };
  }

  return {
    status: "succeeded",
    job_id: job.id,
    profile: result.profile,
    suggestions: result.suggestions,
  };
}
