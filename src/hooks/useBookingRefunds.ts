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
 * The list has no payment fields, so for a cancelled booking whose deposit is
 * due back (`refund_due = true`) the page also reads that one booking to see
 * whether the refund is pending or done. Other bookings cost no extra reads.
 * A failed read just leaves the status unknown.
 */
export function useBookingRefunds(bookings: BookingListItem[]): RefundStatuses {
  const ids = bookings
    .filter((b) => b.status === "cancelled" && b.refund_due === true)
    .map((b) => b.id);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["booking-detail", id],
      queryFn: () => getBooking(id),
      staleTime: 30_000,
    })),
  });

  const statuses: RefundStatuses = {};
  ids.forEach((id, index) => {
    statuses[id] = results[index]?.data?.payment_status;
  });
  return statuses;
}
