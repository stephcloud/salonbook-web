"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, getBooking, type BookingDetail } from "@/lib/api";
import { bookingOutcome } from "@/lib/booking-outcome";

export const POLL_INTERVAL_MS = 2000;
export const POLL_LIMIT_MS = 60_000;

export type ConfirmationPhase =
  | "no-booking" // nothing saved to check
  | "confirming" // polling
  | "paid"
  | "failed"
  | "ended" // cancelled or hold over
  | "slow" // still pending after the time limit
  | "not-found"; // 403, 404 or an unreadable id

export type PaymentConfirmation = {
  phase: ConfirmationPhase;
  booking: BookingDetail | undefined;
  /** The last check failed (network or server) but we are still trying. */
  trouble: boolean;
  /** Start another round of checking after the time limit ran out. */
  checkAgain: () => void;
};

function isGone(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 403 || error.status === 404 || error.status === 422)
  );
}

/**
 * Confirms a payment by asking the API, never by trusting the Paystack
 * redirect. Reads GET /bookings/{id} every 2 seconds for up to 60 seconds,
 * stops as soon as the outcome is known, and stops on unmount.
 */
export function usePaymentConfirmation(
  bookingId: string | null,
): PaymentConfirmation {
  const [round, setRound] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const query = useQuery({
    queryKey: ["payment-confirmation", bookingId, round],
    queryFn: () => getBooking(bookingId as string),
    enabled: bookingId !== null && !timedOut,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (q) => {
      if (isGone(q.state.error)) return false;
      const data = q.state.data;
      if (data && bookingOutcome(data) !== "pending") return false;
      return POLL_INTERVAL_MS;
    },
  });

  const booking = query.data;
  const outcome = booking ? bookingOutcome(booking) : "pending";
  const gone = isGone(query.error);
  const decided = gone || outcome !== "pending";

  // The time limit: one timer per round, cleared when the outcome is known
  // and on unmount, so nothing keeps running after the page is left.
  useEffect(() => {
    if (bookingId === null || decided) return;
    const timer = setTimeout(() => setTimedOut(true), POLL_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [bookingId, decided, round]);

  const checkAgain = useCallback(() => {
    setTimedOut(false);
    setRound((r) => r + 1);
  }, []);

  let phase: ConfirmationPhase;
  if (bookingId === null) phase = "no-booking";
  else if (gone) phase = "not-found";
  else if (outcome !== "pending") phase = outcome;
  else if (timedOut) phase = "slow";
  else phase = "confirming";

  return {
    phase,
    booking,
    trouble: query.isError && !gone,
    checkAgain,
  };
}
