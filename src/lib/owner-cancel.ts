import { ApiError, type OwnerBooking } from "@/lib/api";
import { parseApiTime } from "@/lib/hold";

/**
 * Whether the owner can still cancel: pending or confirmed, and not started.
 * (The API answers 409 once a booking has started or is completed.)
 */
export function canOwnerCancel(
  booking: Pick<OwnerBooking, "status" | "starts_at">,
  nowMs: number,
): boolean {
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return false;
  }
  return parseApiTime(booking.starts_at) > nowMs;
}

export const OWNER_CANCEL_STALE_MESSAGE =
  "This booking can't be cancelled any more";

export type OwnerCancelFailure =
  /** 401: apiFetch is already sending the owner to /login, so stay quiet. */
  | { kind: "signed-out" }
  /** 403: not the owner of this salon. */
  | { kind: "forbidden"; message: string }
  /** 404 or 409: gone, started or completed. The list must be refreshed. */
  | { kind: "stale"; message: string }
  /** 422: the server's own field messages. */
  | { kind: "invalid"; message: string }
  /** Network failure or a server error: trying again may work. */
  | { kind: "retry"; message: string };

/** Maps a failed POST /bookings/{id}/cancel made by the salon owner. */
export function classifyOwnerCancelError(error: unknown): OwnerCancelFailure {
  if (!(error instanceof ApiError)) {
    return {
      kind: "retry",
      message:
        "Could not reach the server. Check your connection and try again.",
    };
  }
  if (error.status === 401) return { kind: "signed-out" };
  if (error.status === 403) {
    return {
      kind: "forbidden",
      message: "Only the owner of this salon can cancel its bookings.",
    };
  }
  if (error.status === 409) {
    return { kind: "stale", message: OWNER_CANCEL_STALE_MESSAGE };
  }
  if (error.status === 404) {
    return {
      kind: "stale",
      message: "This booking could not be found. The list has been refreshed.",
    };
  }
  if (error.status === 422) {
    const fields = Object.values(error.fieldErrors);
    return {
      kind: "invalid",
      message: fields.length > 0 ? fields.join(" ") : error.message,
    };
  }
  return {
    kind: "retry",
    message: "We could not cancel this booking. Please try again.",
  };
}

/**
 * What the API said happened. The deposit amount is not shown: the salon's
 * deposit setting may have changed since the client paid.
 */
export function ownerCancelOutcome(refundDue: boolean | null): string {
  return refundDue === true ? "Deposit refunded in full" : "Booking cancelled";
}
