"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { servicesKey } from "@/hooks/useSalonServices";
import { stylistsKey } from "@/hooks/useSalonStylists";

/**
 * Call after any change to services or stylists: re-reads both lists and asks
 * the server to render again, so the setup checklist and the public salon page
 * show the change. A failed refresh never turns a saved change into an error.
 */
export function useCatalogRefresh(salonId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: servicesKey(salonId) }),
      queryClient.invalidateQueries({ queryKey: stylistsKey(salonId) }),
    ]);
    try {
      router.refresh();
    } catch {
      // The change is saved; the page catches up on the next visit.
    }
  }, [queryClient, router, salonId]);
}
