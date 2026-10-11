"use client";

import { useEffect, useState } from "react";
import { remainingMs } from "@/lib/hold";

/**
 * Time left in a booking's hold. The first render uses the server's clock
 * (`serverNow`), so server and browser render the same text. After mount it
 * ticks every second against this device's clock corrected by the difference
 * to the server, and recomputes from the clock each tick (it never counts
 * down by subtraction, so a throttled background tab catches up).
 * The correction ignores network delay, so it can be a few seconds generous;
 * the page re-reads the booking at zero rather than trusting this alone.
 */
export function useCountdown(createdAt: string, serverNow: number): number {
  const [left, setLeft] = useState(() => remainingMs(createdAt, serverNow));

  useEffect(() => {
    const skew = serverNow - Date.now();
    const tick = () => setLeft(remainingMs(createdAt, Date.now(), skew));
    tick();
    const timer = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(timer);
  }, [createdAt, serverNow]);

  return left;
}
