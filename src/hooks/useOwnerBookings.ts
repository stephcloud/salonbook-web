"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ApiError,
  listSalonBookings,
  type OwnerBookingFilters,
} from "@/lib/api";

export const ownerBookingsKey = (
  salonId: string,
  filters: OwnerBookingFilters,
  page: number,
) => ["salon", salonId, "owner-bookings", filters, page] as const;

/** One retry, and only for a dropped connection or a server error (a cold start). */
function retryOnce(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  return !(error instanceof ApiError) || error.status >= 500;
}

/**
 * One page of the owner's bookings. The previous page stays on screen while
 * the next one loads. `enabled` is false while the filters are invalid.
 */
export function useOwnerBookings(
  salonId: string,
  filters: OwnerBookingFilters,
  page: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ownerBookingsKey(salonId, filters, page),
    queryFn: () => listSalonBookings(salonId, filters, page),
    placeholderData: keepPreviousData,
    retry: retryOnce,
    retryDelay: 2000,
    enabled,
  });
}
