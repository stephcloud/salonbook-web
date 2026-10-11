import type { BookingDetail } from "@/lib/api";

export type CancelOutcome = {
  kind: "refund" | "no-refund" | "nothing-charged" | "unknown";
  /** Empty for "unknown": there is nothing to say about money. */
  message: string;
};

/**
 * What cancelling did, straight after the API answered. `refundDue` is the
 * API's own answer; `wasPaid` says whether the booking was confirmed (deposit
 * paid) before it was cancelled, which is what tells "no refund because it
 * was inside the window" apart from "nothing was ever charged".
 */
export function cancelOutcome(input: {
  /** true: the deposit was paid; false: it was not; null: could not be checked. */
  wasPaid: boolean | null;
  refundDue: boolean | null;
  cancellationHours: number;
}): CancelOutcome {
  if (input.refundDue === true) {
    return { kind: "refund", message: "Your deposit will be refunded." };
  }
  if (input.refundDue === false && input.wasPaid === true) {
    return {
      kind: "no-refund",
      message: `No refund: it was cancelled within ${input.cancellationHours} hours of the start time.`,
    };
  }
  if (input.refundDue === false && input.wasPaid === false) {
    return { kind: "nothing-charged", message: "Nothing was charged." };
  }
  // The API gave no refund answer, or we could not tell whether a deposit was
  // paid: make no claim about money.
  return { kind: "unknown", message: "" };
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
  if (refundDue === false) return "No refund is due on this booking.";
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
