/**
 * Returns the value only when it is a same-site relative path: one leading
 * "/", no second "/" or "\" right after it, no control characters. Anything
 * else (absolute URLs, protocol-relative URLs, junk) becomes null.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return null;
  return raw;
}
