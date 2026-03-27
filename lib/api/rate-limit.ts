import { NextResponse } from "next/server";

/**
 * Simple in-memory sliding-window rate limit (per Node process).
 * For multi-instance / serverless at scale, replace with Redis (e.g. Upstash).
 */
type BucketConfig = { windowMs: number; max: number };

const buckets: Record<string, BucketConfig> = {
  /** LLM / RAG: translate, compare, benchmark, analyze */
  llm: {
    windowMs: Number(process.env.RATE_LIMIT_LLM_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_LLM_MAX) || 40,
  },
  /** Contract + resume file uploads */
  upload: {
    windowMs: Number(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS) || 60 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_UPLOAD_MAX) || 60,
  },
  /** Resume profiling POST */
  profile: {
    windowMs: Number(process.env.RATE_LIMIT_PROFILE_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_PROFILE_MAX) || 30,
  },
  /** Azure token endpoints (per authenticated user) */
  azure: {
    windowMs: Number(process.env.RATE_LIMIT_AZURE_WINDOW_MS) || 60 * 1000,
    max: Number(process.env.RATE_LIMIT_AZURE_MAX) || 30,
  },
};

const hits = new Map<string, number[]>();

function prune(key: string, windowMs: number): number[] {
  const now = Date.now();
  const arr = hits.get(key) ?? [];
  const kept = arr.filter((t) => now - t < windowMs);
  hits.set(key, kept);
  return kept;
}

export type RateLimitKind = keyof typeof buckets;

/**
 * @returns true if allowed, false if rate limited
 */
export function allowRateLimit(userId: string, kind: RateLimitKind): boolean {
  const cfg = buckets[kind];
  const key = `${kind}:${userId}`;
  const kept = prune(key, cfg.windowMs);
  if (kept.length >= cfg.max) {
    return false;
  }
  kept.push(Date.now());
  hits.set(key, kept);
  return true;
}

export function rateLimitedResponse(retryAfterSec = 60): NextResponse {
  return NextResponse.json(
    { detail: "Too many requests. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
