"use client";

import { useEffect, useRef, useState } from "react";
import { trackClockSkew } from "@/lib/clock-skew";

const FAST_MS = 1000;
const SLOW_MS = 30_000;

/**
 * The current time in ms, for a whole page that needs one clock (for example a
 * list of bookings with holds).
 *
 * It starts from the server's render stamp (`serverNow`) so the first paint
 * matches the server render, then measures the server's clock afresh and keeps
 * time against this device's clock corrected by that measurement (see
 * `trackClockSkew`). If the page turns out to be a stale one restored from a
 * cache, `onStale` is called so the caller can reload its data.
 *
 * It ticks every second while `now` is before `fastUntil` (the end of the
 * latest running hold), and every 30 seconds otherwise or when `fastUntil` is
 * null, so nothing runs every second once there is no countdown to show.
 */
export function useNow(
  serverNow: number,
  fastUntil: number | null,
  onStale?: () => void,
): number {
  const [now, setNow] = useState(serverNow);
  const skew = useRef(0);
  const staleHandler = useRef(onStale);

  useEffect(() => {
    staleHandler.current = onStale;
  });

  // Measured once per server stamp. Not re-measured when the tick speed
  // changes: the stamp would be older by then.
  useEffect(
    () =>
      trackClockSkew(serverNow, {
        apply: (value) => {
          skew.current = value;
        },
        onMeasured: () => setNow(Date.now() + skew.current),
        onStale: () => staleHandler.current?.(),
      }),
    [serverNow],
  );

  const fast = fastUntil !== null && now < fastUntil;
  useEffect(() => {
    const tick = () => setNow(Date.now() + skew.current);
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, fast ? FAST_MS : SLOW_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [fast]);

  return now;
}
