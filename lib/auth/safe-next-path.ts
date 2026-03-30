/**
 * Safe in-app redirect target after sign-in (open redirect protection).
 * Must be a same-origin path starting with a single "/".
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/resume";
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/resume";
  return trimmed;
}
