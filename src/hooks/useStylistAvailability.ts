"use client";

import { useQuery } from "@tanstack/react-query";
import { getAvailability, type Availability } from "@/lib/api";

export const availabilityKey = (stylistId: string) =>
  ["stylist", stylistId, "availability"] as const;

/**
 * One stylist's rules. `initialData` is the server's first read (only for the
 * stylist shown first). One automatic retry, because the free-tier server can
 * be asleep on the first call.
 */
export function useStylistAvailability(
  stylistId: string,
  initialData?: Availability,
) {
  return useQuery({
    queryKey: availabilityKey(stylistId),
    queryFn: () => getAvailability(stylistId),
    initialData,
    retry: 1,
  });
}
