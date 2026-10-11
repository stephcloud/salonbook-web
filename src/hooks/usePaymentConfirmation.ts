"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, getBooking, type BookingDetail } from "@/lib/api";
import { bookingOutcome } from "@/lib/booking-outcome";

export const POLL_INTERVAL_MS = 2000;
export const POLL_LIMIT_MS = 60_000;
/**
 * A "failed" payment only counts once it has been read as failed for this
 * long. Paying again reuses the same payment record, so right after a retry
 * the API can still say "failed" for a moment before the webhook marks it paid.
 */
export const FAILED_GRACE_MS = 10_000;

export type ConfirmationPhase =
  | "no-booking" // nothing saved to check
  | "confirming" // polling
  | "paid"
  | "failed"
  | "ended" // cancelled or hold over
  | "slow" // still pending after the time limit
  | "not-found" // 403, 404 or an unreadable id
  | "signed-out"; // 401: apiFetch is sending the client to /login

export type PaymentConfirmation = {
  phase: ConfirmationPhase;
  booking: BookingDetail | undefined;
  /** The last check failed (network or server) but we are still trying. */
  trouble: boolean;
  /** Start another round of checking after the time limit ran out. */
  checkAgain: () => void;
};

type Reading = {
  booking: BookingDetail;
  /** How long this booking has been read as "failed" in a row (0 when it has not). */
  failedFor: number;
};

function isGone(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 403 || error.status === 404 || error.status === 422)
  );
}

function isSignedOut(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** True once the reading cannot change what the client should be told. */
function isSettled(reading: Reading | undefined): boolean {
  if (!reading) return false;
  const outcome = bookingOutcome(reading.booking);
  if (outcome === "paid" || outcome === "ended") return true;
  return outcome === "failed" && reading.failedFor >= FAILED_GRACE_MS;
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
  const firstFailedAt = useRef<number | null>(null);

  const query = useQuery({
    queryKey: ["payment-confirmation", bookingId, round],
    queryFn: async (): Promise<Reading> => {
      const booking = await getBooking(bookingId as string);
      if (bookingOutcome(booking) === "failed") {
        firstFailedAt.current ??= Date.now();
      } else {
        firstFailedAt.current = null;
      }
      const failedFor =
        firstFailedAt.current === null ? 0 : Date.now() - firstFailedAt.current;
      return { booking, failedFor };
    },
    enabled: bookingId !== null && !timedOut,
    staleTime: 0,
    gcTime: 0,
    // A hidden tab keeps checking, so the 60 seconds are 60 seconds of checking.
    refetchIntervalInBackground: true,
    refetchInterval: (q) => {
      if (isGone(q.state.error) || isSignedOut(q.state.error)) return false;
      if (isSettled(q.state.data)) return false;
      return POLL_INTERVAL_MS;
    },
  });

  const reading = query.data;
  const booking = reading?.booking;
  const outcome = booking ? bookingOutcome(booking) : "pending";
  const gone = isGone(query.error);
  const signedOut = isSignedOut(query.error);
  const decided = gone || signedOut || isSettled(reading);

  // The time limit: one timer per round, cleared when the outcome is known
  // and on unmount, so nothing keeps running after the page is left.
  useEffect(() => {
    if (bookingId === null || decided) return;
    const timer = setTimeout(() => setTimedOut(true), POLL_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [bookingId, decided, round]);

  const checkAgain = useCallback(() => {
    firstFailedAt.current = null;
    setTimedOut(false);
    setRound((r) => r + 1);
  }, []);

  let phase: ConfirmationPhase;
  if (bookingId === null) phase = "no-booking";
  else if (gone) phase = "not-found";
  else if (signedOut) phase = "signed-out";
  else if (isSettled(reading) && outcome !== "pending") phase = outcome;
  else if (timedOut) phase = outcome === "failed" ? "failed" : "slow";
  else phase = "confirming";

  return {
    phase,
    booking,
    trouble: query.isError && !gone && !signedOut,
    checkAgain,
  };
}
