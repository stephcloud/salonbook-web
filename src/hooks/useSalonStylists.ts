"use client";

import { useQuery } from "@tanstack/react-query";
import { listSalonStylists, type Stylist } from "@/lib/api";

export const stylistsKey = (salonId: string) =>
  ["salon", salonId, "stylists"] as const;

/** The salon's stylists with the service ids each one offers (see `useSalonServices`). */
export function useSalonStylists(salonId: string, initialData: Stylist[]) {
  return useQuery({
    queryKey: stylistsKey(salonId),
    queryFn: () => listSalonStylists(salonId),
    initialData,
  });
}
