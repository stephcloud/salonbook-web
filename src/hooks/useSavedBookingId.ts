"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { readPendingBookingId } from "@/lib/payment-storage";

const subscribe = () => () => {};
const serverSnapshot = (): undefined => undefined;

/**
 * The booking id saved before leaving for Paystack, read from sessionStorage.
 * Returns undefined on the server and during hydration (storage only exists in
 * the browser), then the id, or null when nothing valid is saved. The first
 * browser read is kept, so clearing the saved id later (once the outcome is
 * known) does not change what the page is showing.
 */
export function useSavedBookingId(): string | null | undefined {
  const firstRead = useRef<string | null | undefined>(undefined);
  const getSnapshot = useCallback(() => {
    if (firstRead.current === undefined) {
      firstRead.current = readPendingBookingId();
    }
    return firstRead.current;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
}
