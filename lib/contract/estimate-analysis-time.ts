/**
 * Heuristic ETA for contract upload + compliance analysis (no server progress stream).
 * Tune via NEXT_PUBLIC_CONTRACT_ANALYZE_ESTIMATE_SEC (analysis segment, seconds).
 */

function analyzeSegmentSeconds(): number {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONTRACT_ANALYZE_ESTIMATE_SEC) {
    const n = Number(process.env.NEXT_PUBLIC_CONTRACT_ANALYZE_ESTIMATE_SEC);
    if (!Number.isNaN(n) && n > 0) return Math.min(300, n);
  }
  return 48;
}

/** Upload time heuristic: larger PDFs take longer to send + parse (capped). */
function uploadSegmentSeconds(fileSizeBytes: number): number {
  const mb = fileSizeBytes / (1024 * 1024);
  return Math.min(40, Math.ceil(4 + mb * 8));
}

/**
 * Rough total seconds from start of upload through typical analysis completion.
 * Not a guarantee — actual time varies with network, queue, and LLM latency.
 */
export function estimateContractFlowTotalSeconds(fileSizeBytes: number): number {
  const upload = uploadSegmentSeconds(fileSizeBytes);
  const analysis = analyzeSegmentSeconds();
  return Math.min(300, upload + analysis);
}

/** Remaining seconds from a single start time (upload + analyze as one block). */
export function estimateRemainingSeconds(
  fileSizeBytes: number,
  elapsedSeconds: number,
): number {
  const total = estimateContractFlowTotalSeconds(fileSizeBytes);
  return Math.max(0, total - elapsedSeconds);
}

/** Bar fill 0–92% from elapsed vs estimate (never hits 100% until route unmounts). */
export function estimateProgressPercent(fileSizeBytes: number, elapsedSeconds: number): number {
  const total = Math.max(estimateContractFlowTotalSeconds(fileSizeBytes), 1);
  return Math.min(92, (elapsedSeconds / total) * 100);
}

/**
 * Remaining seconds from server-reported progress (linear extrapolation).
 * Returns null if progress is 0 or complete — caller should fall back to heuristics.
 */
export function estimateRemainingFromServerProgress(
  progressPercent: number,
  elapsedSeconds: number,
): number | null {
  if (progressPercent <= 0 || progressPercent >= 100) return null;
  const remaining = (elapsedSeconds * (100 - progressPercent)) / progressPercent;
  return Math.max(0, Math.round(remaining));
}
