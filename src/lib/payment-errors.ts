import { ApiError } from "@/lib/api";
import {
  isSalonNotAccepting,
  SALON_NOT_ACCEPTING_MESSAGE,
} from "@/lib/salon-status";

export type PayFailure =
  /** 401: apiFetch is already sending the client to /login, so stay quiet. */
  | { kind: "signed-out" }
  /** 403, 404 or 422: not the client's booking, or no such booking. */
  | { kind: "not-found" }
  /**
   * 409: the booking can no longer be paid (cancelled; the same status is the
   * likely answer for an ended hold or an already-paid booking). The booking
   * itself says which, so the screen re-reads it instead of guessing.
   */
  | { kind: "closed"; message: string }
  | { kind: "other"; message: string };

const OTHER_MESSAGE = "We could not start the payment. Please try again.";

/**
 * Maps a failed POST /bookings/{id}/pay. Checked against the live API: a
 * cancelled booking is 409 "This booking can no longer be paid for.", someone
 * else's booking is 403 "forbidden", an unknown booking is 404 "not found" and
 * a malformed id is 422. A salon that is pending or suspended is 409 "salon
 * is not accepting bookings"; it is shown in our own words.
 */
export function classifyPayError(error: unknown): PayFailure {
  if (!(error instanceof ApiError)) {
    return {
      kind: "other",
      message:
        "Could not reach the server. Check your connection and try again.",
    };
  }
  if (error.status === 401) return { kind: "signed-out" };
  if (error.status === 403 || error.status === 404 || error.status === 422) {
    return { kind: "not-found" };
  }
  if (error.status === 409) {
    return {
      kind: "closed",
      message: isSalonNotAccepting(error)
        ? SALON_NOT_ACCEPTING_MESSAGE
        : error.message || "This booking can no longer be paid for.",
    };
  }
  // Server errors can carry raw text; show our own wording instead.
  return {
    kind: "other",
    message:
      error.status >= 500 ? OTHER_MESSAGE : error.message || OTHER_MESSAGE,
  };
}
