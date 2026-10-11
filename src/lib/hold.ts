/** A pending booking is held for this long after it was created (CLAUDE.md). */
export const HOLD_MINUTES = 15;

const HOLD_MS = HOLD_MINUTES * 60_000;

/** When the hold ends, in ms since the epoch: the booking's own `created_at` plus 15 minutes. */
export function holdEndsAt(createdAt: string): number {
  return Date.parse(createdAt) + HOLD_MS;
}

/**
 * Milliseconds left in the hold, never below 0. `skewMs` is "server time minus
 * this device's clock", so a wrong device clock does not change the answer.
 * An unreadable `created_at` counts as no time left.
 */
export function remainingMs(
  createdAt: string,
  nowMs: number,
  skewMs = 0,
): number {
  const end = holdEndsAt(createdAt);
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - (nowMs + skewMs));
}

/** "14:59" style countdown; rounds up so it shows 0:01 until the very end. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
