"use client";

import { useQueries } from "@tanstack/react-query";
import {
  getBooking,
  type BookingDetail,
  type BookingListItem,
} from "@/lib/api";

export type RefundStatuses = Record<
  string,
  BookingDetail["payment_status"] | undefined
>;

/**
 * At most this many bookings are looked up. The list is sorted by start time,
 * so these are the latest cancelled ones; older ones show the plain
 * "Your deposit will be refunded." note from `refund_due`.
 */
export const MAX_REFUND_LOOKUPS = 10;
const REFUND_RECHECK_MS = 30_000;

/**
 * The list has no payment fields, so for a cancelled booking whose deposit is
 * due back (`refund_due = true`) the page also reads that one booking to see
 * whether the refund is pending or done, and checks again every 30 seconds
 * while it is still pending. Other bookings cost no extra reads. A failed read
 * just leaves the status unknown.
 */
export function useBookingRefunds(bookings: BookingListItem[]): RefundStatuses {
  const ids = bookings
    .filter((b) => b.status === "cancelled" && b.refund_due === true)
    .slice(0, MAX_REFUND_LOOKUPS)
    .map((b) => b.id);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["booking-detail", id],
      queryFn: () => getBooking(id),
      staleTime: 30_000,
      refetchInterval: (query: {
        state: { data?: { payment_status: BookingDetail["payment_status"] } };
      }) =>
        query.state.data?.payment_status === "refund_pending"
          ? REFUND_RECHECK_MS
          : false,
    })),
  });

  const statuses: RefundStatuses = {};
  ids.forEach((id, index) => {
    statuses[id] = results[index]?.data?.payment_status;
  });
  return statuses;
}
