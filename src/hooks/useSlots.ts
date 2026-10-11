"use client";

import { useQuery } from "@tanstack/react-query";
import { getSlots } from "@/lib/api";

export function slotsQueryKey(
  stylistId: string,
  serviceId: string,
  date: string,
) {
  return ["slots", stylistId, serviceId, date] as const;
}

/** Free start times for one stylist, service and day. `enabled` is false for an invalid date. */
export function useSlots(
  stylistId: string,
  serviceId: string,
  date: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: slotsQueryKey(stylistId, serviceId, date),
    queryFn: () => getSlots(stylistId, serviceId, date),
    enabled,
  });
}
