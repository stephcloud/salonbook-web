"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { servicesKey } from "@/hooks/useSalonServices";
import { stylistsKey } from "@/hooks/useSalonStylists";

/**
 * Call after any change to services or stylists: re-reads both lists and asks
 * the server to render again, so the setup checklist and the public salon page
 * show the change. The lists come from the query cache (seeded by the server
 * render), which only this call refreshes: `router.refresh()` alone would not.
 */
export function useCatalogRefresh(salonId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: servicesKey(salonId) }),
      queryClient.invalidateQueries({ queryKey: stylistsKey(salonId) }),
    ]);
    router.refresh();
  }, [queryClient, router, salonId]);
}
