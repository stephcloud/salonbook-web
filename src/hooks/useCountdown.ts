"use client";

import { useEffect, useRef, useState } from "react";
import { trackClockSkew } from "@/lib/clock-skew";
import { remainingMs } from "@/lib/hold";

/**
 * Time left in a booking's hold. The first render uses the server's render
 * stamp (`serverNow`), so server and browser render the same text. After mount
 * it measures the server's clock afresh and ticks every second against this
 * device's clock corrected by that measurement (see `trackClockSkew`),
 * recomputing from the clock each tick (it never counts down by subtraction,
 * so a throttled background tab catches up). If the page turns out to be a
 * stale one restored from a cache, `onStale` is called so the caller can
 * re-read the booking. The page also re-reads the booking at zero rather than
 * trusting this alone.
 */
export function useCountdown(
  createdAt: string,
  serverNow: number,
  onStale?: () => void,
): number {
  const [left, setLeft] = useState(() => remainingMs(createdAt, serverNow));
  const skew = useRef(0);
  const created = useRef(createdAt);
  const staleHandler = useRef(onStale);

  useEffect(() => {
    created.current = createdAt;
    staleHandler.current = onStale;
  });

  // Measured once per server stamp.
  useEffect(
    () =>
      trackClockSkew(serverNow, {
        apply: (value) => {
          skew.current = value;
        },
        onMeasured: () =>
          setLeft(remainingMs(created.current, Date.now(), skew.current)),
        onStale: () => staleHandler.current?.(),
      }),
    [serverNow],
  );

  useEffect(() => {
    const tick = () =>
      setLeft(remainingMs(createdAt, Date.now(), skew.current));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [createdAt]);

  return left;
}
