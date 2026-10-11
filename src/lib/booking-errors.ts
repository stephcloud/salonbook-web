import { ApiError, type FieldErrors } from "@/lib/api";

export type BookingFailure =
  | { kind: "clients-only"; message: string }
  | { kind: "pending-limit"; message: string }
  | { kind: "slot-taken"; message: string }
  | { kind: "invalid"; message: string; fieldErrors: FieldErrors }
  | { kind: "signed-out"; message: string }
  | { kind: "other"; message: string };

const SLOT_TAKEN_MESSAGE =
  "That time was just taken. Please pick another time.";
const OTHER_MESSAGE = "We could not create your booking. Please try again.";

/**
 * Maps a failed POST /bookings to what the wizard should do. Checked against
 * the live API: an owner gets 403 `forbidden`; a taken or off-grid slot gets
 * 409; reaching 3 unpaid pending bookings is ALSO 409. The API gives no code
 * to tell those two apart, only the message ("You already have 3 unpaid
 * pending bookings..."), so this matches on that text. If the backend rewords
 * it, the limit would be shown as "slot taken" (see the test for a generic
 * 409). 422 carries either a field-error list or a plain message
 * ("starts_at must be in the future"). A 401 means apiFetch is already
 * sending the user to /login, so the wizard must stay quiet and disabled.
 */
export function classifyBookingError(error: unknown): BookingFailure {
  if (!(error instanceof ApiError)) {
    return {
      kind: "other",
      message:
        "Could not reach the server. Check your connection and try again.",
    };
  }
  if (error.status === 401) {
    return { kind: "signed-out", message: "Redirecting you to sign in..." };
  }
  if (error.status === 403) {
    return { kind: "clients-only", message: "Booking is for clients." };
  }
  if (error.status === 409) {
    return /pending bookings/i.test(error.message)
      ? { kind: "pending-limit", message: error.message }
      : { kind: "slot-taken", message: SLOT_TAKEN_MESSAGE };
  }
  if (error.status === 422) {
    return {
      kind: "invalid",
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }
  // Server errors can carry raw text; show our own wording instead.
  return {
    kind: "other",
    message:
      error.status >= 500 ? OTHER_MESSAGE : error.message || OTHER_MESSAGE,
  };
}
