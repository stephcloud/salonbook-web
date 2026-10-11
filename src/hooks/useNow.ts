"use client";

import { useEffect, useRef, useState } from "react";

const FAST_MS = 1000;
const SLOW_MS = 30_000;

/**
 * The current time in ms, for a whole page that needs one clock (for example a
 * list of bookings with holds). It starts from the server's time so the first
 * paint matches the server render, then ticks against this device's clock
 * corrected by the difference to the server. `fast` ticks every second (while
 * a countdown is showing); otherwise every 30 seconds.
 */
export function useNow(serverNow: number, fast: boolean): number {
  const [now, setNow] = useState(serverNow);
  // Measured once, on the first run: later runs (when `fast` changes) must
  // not re-measure against a server time that is no longer current.
  const skew = useRef<number | null>(null);

  useEffect(() => {
    if (skew.current === null) skew.current = serverNow - Date.now();
    const tick = () => setNow(Date.now() + (skew.current ?? 0));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, fast ? FAST_MS : SLOW_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [serverNow, fast]);

  return now;
}
