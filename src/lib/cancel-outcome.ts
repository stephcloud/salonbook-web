import type { BookingDetail } from "@/lib/api";

export type CancelOutcome = {
  kind: "refund" | "no-refund" | "nothing-charged" | "unknown";
  message: string;
};

/**
 * What cancelling did, straight after the API answered. `refundDue` is the
 * API's own answer; `wasPaid` says whether the booking was confirmed (deposit
 * paid) before it was cancelled, which is what tells "no refund because it
 * was inside the window" apart from "nothing was ever charged".
 */
export function cancelOutcome(input: {
  wasPaid: boolean;
  refundDue: boolean | null;
  cancellationHours: number;
}): CancelOutcome {
  if (input.refundDue === true) {
    return { kind: "refund", message: "Your deposit will be refunded." };
  }
  if (input.refundDue === false) {
    return input.wasPaid
      ? {
          kind: "no-refund",
          message: `No refund, cancelled inside the ${input.cancellationHours}-hour window.`,
        }
      : { kind: "nothing-charged", message: "Nothing was charged." };
  }
  return { kind: "unknown", message: "Your booking is cancelled." };
}

/**
 * A line for an already cancelled booking in the list. The list has no
 * payment fields, so it only says what `refund_due` says (null for a hold
 * that simply expired says nothing).
 */
export function cancelledListNote(
  refundDue: boolean | null,
  paymentStatus?: BookingDetail["payment_status"],
): string | null {
  if (refundDue === true) {
    if (paymentStatus === "refunded") return "Your deposit was refunded.";
    if (paymentStatus === "refund_pending") {
      return "Your refund is being processed.";
    }
    return "Your deposit will be refunded.";
  }
  if (refundDue === false) return "No refund due.";
  return null;
}

/** Badge text for a booking's refund, from the detail's payment_status. */
export function refundBadge(
  paymentStatus: BookingDetail["payment_status"] | undefined,
): "Refund pending" | "Refunded" | null {
  if (paymentStatus === "refund_pending") return "Refund pending";
  if (paymentStatus === "refunded") return "Refunded";
  return null;
}
