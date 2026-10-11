import type { BookingDetail } from "@/lib/api";

/**
 * What a booking's state means for the payment screens:
 * - paid: confirmed (or already completed), or the deposit is recorded as paid
 * - failed: Paystack reported the payment failed and the booking is still open
 * - ended: cancelled, or a no-show; the hold is over and cannot be paid
 * - pending: still waiting (the hold may still be running)
 */
export type BookingOutcome = "paid" | "failed" | "ended" | "pending";

export function bookingOutcome(
  booking: Pick<BookingDetail, "status" | "payment_status">,
): BookingOutcome {
  if (booking.status === "confirmed" || booking.status === "completed") {
    return "paid";
  }
  if (booking.status === "cancelled" || booking.status === "no_show") {
    return "ended";
  }
  if (booking.payment_status === "paid") return "paid";
  if (booking.payment_status === "failed") return "failed";
  return "pending";
}
