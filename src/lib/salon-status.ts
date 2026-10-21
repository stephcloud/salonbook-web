import { ApiError, type SalonStatus } from "@/lib/api";

/** What each moderation status means for the owner, in one place. */
export const SALON_STATUS: Record<
  SalonStatus,
  {
    label: string;
    variant: "pending" | "confirmed" | "cancelled";
    message: string;
  }
> = {
  pending: {
    label: "Waiting for approval",
    variant: "pending",
    message:
      "We're checking your salon. It won't appear in the public list until it's approved.",
  },
  approved: {
    label: "Approved",
    variant: "confirmed",
    message: "Your salon is live. Customers can find and book it.",
  },
  suspended: {
    label: "Suspended",
    variant: "cancelled",
    message: "Your salon is hidden from customers and bookings are paused.",
  },
};

export const SALON_NOT_ACCEPTING_MESSAGE =
  "This salon isn't taking bookings right now.";

/**
 * Slots, booking create and pay answer 409 "salon is not accepting bookings"
 * when the salon is pending or suspended. The API gives no code for it, only
 * that message, so this matches on the text (like the pending-limit check in
 * booking-errors.ts). If the backend rewords it, the 409 falls back to the
 * caller's generic 409 handling.
 */
export function isSalonNotAccepting(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    /not accepting bookings/i.test(error.message)
  );
}
