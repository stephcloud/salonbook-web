import type { BookingListItem } from "@/lib/api";
import { isHoldExpired, parseApiTime } from "@/lib/hold";

export type BookingTab = "upcoming" | "past";

type Tabbable = Pick<
  BookingListItem,
  "status" | "starts_at" | "ends_at" | "cancelled_at" | "created_at"
>;

/**
 * Which tab a booking belongs to.
 * - Upcoming: an unpaid booking whose 15-minute hold is still running, and a
 *   confirmed booking that has not ended yet (even if it has started).
 * - Past: everything finished or closed: ended, completed, no-show, cancelled
 *   (including cancelled future bookings) and expired holds.
 */
export function bookingTab(booking: Tabbable, nowMs: number): BookingTab {
  if (booking.status === "pending") {
    return isHoldExpired(booking, nowMs) ? "past" : "upcoming";
  }
  if (booking.status === "confirmed") {
    return parseApiTime(booking.ends_at) > nowMs ? "upcoming" : "past";
  }
  return "past";
}

function startsAt(booking: Tabbable): number {
  return parseApiTime(booking.starts_at);
}

/** Splits the list into the two tabs: Upcoming soonest first, Past most recent first. */
export function splitBookings<T extends Tabbable>(
  bookings: T[],
  nowMs: number,
): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const booking of bookings) {
    (bookingTab(booking, nowMs) === "upcoming" ? upcoming : past).push(booking);
  }
  upcoming.sort((a, b) => startsAt(a) - startsAt(b));
  past.sort((a, b) => startsAt(b) - startsAt(a));
  return { upcoming, past };
}
