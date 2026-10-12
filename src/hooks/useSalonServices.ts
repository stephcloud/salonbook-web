"use client";

import { useQuery } from "@tanstack/react-query";
import { listSalonServices, type Service } from "@/lib/api";

export const servicesKey = (salonId: string) =>
  ["salon", salonId, "services"] as const;

/**
 * The salon's services. The page reads them on the server and passes them as
 * `initialData`, so the first paint is complete; after a change the query is
 * invalidated and reads them again.
 */
export function useSalonServices(salonId: string, initialData: Service[]) {
  return useQuery({
    queryKey: servicesKey(salonId),
    queryFn: () => listSalonServices(salonId),
    initialData,
  });
}
