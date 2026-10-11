const KEY = "sb_pending_booking";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Remembers which booking the client is paying for, because Paystack's
 * redirect is never trusted to say so. sessionStorage can be missing or throw
 * (private windows, blocked storage), so every call is guarded.
 */
export function savePendingBookingId(id: string): boolean {
  try {
    window.sessionStorage.setItem(KEY, id);
    return true;
  } catch {
    return false;
  }
}

/** The saved booking id, or null when nothing (or something that is not a UUID) is saved. */
export function readPendingBookingId(): string | null {
  try {
    const value = window.sessionStorage.getItem(KEY);
    return value !== null && UUID_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingBookingId(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
