import type { BookingListItem } from "@/lib/api";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
/** The "current time" used by the bookings tests. */
export const NOW = Date.parse("2026-10-11T12:00:00Z");

const iso = (ms: number) => new Date(ms).toISOString();

type Options = {
  /** When the appointment starts, relative to NOW. */
  startsInMs?: number;
  /** How long ago the booking was made, relative to NOW. */
  createdAgoMs?: number;
  refundDue?: boolean | null;
  cancelledAt?: string | null;
  cancellationHours?: number;
  priceType?: "fixed" | "quote";
  price?: number | null;
  serviceName?: string;
  salonName?: string;
};

/** A booking from GET /bookings, for tests. */
export function makeBooking(
  id: string,
  status: BookingListItem["status"],
  {
    startsInMs = 48 * HOUR,
    createdAgoMs = 0,
    refundDue = null,
    cancelledAt = null,
    cancellationHours = 24,
    priceType = "fixed",
    price = 1500000,
    serviceName = "Box braids",
    salonName = "Pink Studio",
  }: Options = {},
): BookingListItem {
  return {
    id,
    client_id: "c1",
    stylist_id: "s1",
    service_id: `service-${id}`,
    starts_at: iso(NOW + startsInMs),
    ends_at: iso(NOW + startsInMs + HOUR),
    status,
    refund_due: refundDue,
    cancelled_at: cancelledAt,
    created_at: iso(NOW - createdAgoMs),
    salon: {
      id: "salon-1",
      name: salonName,
      address: "12 Admiralty Way, Lekki",
      phone: "08012345678",
      cancellation_hours: cancellationHours,
      deposit_amount: 500000,
      image_url: null,
    },
    service: {
      id: `service-${id}`,
      name: serviceName,
      duration_minutes: 60,
      price_type: priceType,
      price: priceType === "quote" ? null : price,
    },
    stylist: { id: "s1", name: "Amara", image_url: null },
  };
}
