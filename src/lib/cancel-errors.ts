import { ApiError } from "@/lib/api";

export type CancelFailure =
  /** 401: apiFetch is already sending the client to /login, so stay quiet. */
  | { kind: "signed-out" }
  /** 403, 404 or 422: not the client booking, or no such booking. */
  | { kind: "not-found"; message: string }
  /** Another 4xx: the API refused (for example too late); show its reason. */
  | { kind: "refused"; message: string }
  | { kind: "other"; message: string };

const OTHER_MESSAGE = "We could not cancel your booking. Please try again.";

/**
 * Maps a failed POST /bookings/{id}/cancel. Checked against the live API: a
 * booking that is not the client's is 403 "forbidden", an unknown one 404, a
 * malformed id 422, and cancelling twice is 200 (not an error). Any other
 * refusal (such as cancelling too late) shows the API's own reason.
 */
export function classifyCancelError(error: unknown): CancelFailure {
  if (!(error instanceof ApiError)) {
    return {
      kind: "other",
      message:
        "Could not reach the server. Check your connection and try again.",
    };
  }
  if (error.status === 401) return { kind: "signed-out" };
  if (error.status === 403 || error.status === 404 || error.status === 422) {
    return {
      kind: "not-found",
      message: "We could not find this booking in your account.",
    };
  }
  if (error.status >= 400 && error.status < 500) {
    return { kind: "refused", message: error.message || OTHER_MESSAGE };
  }
  // Server errors can carry raw text; show our own wording instead.
  return { kind: "other", message: OTHER_MESSAGE };
}
