/** A pending booking is held for this long after it was created (CLAUDE.md). */
export const HOLD_MINUTES = 15;

const HOLD_MS = HOLD_MINUTES * 60_000;

const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Reads an API timestamp as UTC. The API sends "...Z", but a timestamp with
 * no zone or offset would otherwise be read in the device's local time and
 * shift the countdown by the device's UTC offset, so it is treated as UTC.
 */
export function parseApiTime(value: string): number {
  const text = value.trim();
  return Date.parse(HAS_ZONE.test(text) ? text : `${text}Z`);
}

/** When the hold ends, in ms since the epoch: the booking's own `created_at` plus 15 minutes. */
export function holdEndsAt(createdAt: string): number {
  return parseApiTime(createdAt) + HOLD_MS;
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

/**
 * True for an unpaid hold that has run out: still "pending" after the 15
 * minutes, or already "cancelled" by the API with no `cancelled_at` (a cancel
 * by the client sets it; checked against the live API).
 */
export function isHoldExpired(
  booking: { status: string; cancelled_at: string | null; created_at: string },
  nowMs: number,
): boolean {
  if (booking.status === "pending") {
    return remainingMs(booking.created_at, nowMs) <= 0;
  }
  return booking.status === "cancelled" && booking.cancelled_at === null;
}

/** "14:59" style countdown; rounds up so it shows 0:01 until the very end. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
