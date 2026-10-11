import { fetchClockSkew } from "@/lib/api";

/**
 * A page whose render stamp is older than this when the browser measures the
 * server clock was restored from a cache (or sat unused), so what it shows
 * may be out of date.
 */
export const STALE_PAYLOAD_MS = 15_000;

/**
 * Works out how far this device's clock is from the server's, as
 * "server time minus device time" (what `remainingMs` calls `skewMs`).
 *
 * It first applies the server's render stamp (`serverNow`), so server and
 * browser render the same text. Then it measures the server's clock afresh
 * and applies that. A render stamp is only as fresh as the page: if the page
 * came back from a cache it is old, and the fresh measurement is the one to
 * trust. When the two differ by more than STALE_PAYLOAD_MS the page's data is
 * stale and `onStale` is called once.
 *
 * `apply` receives each skew; `onMeasured` runs after the fresh one so the
 * caller can redraw. Returns a function that stops all of it.
 */
export function trackClockSkew(
  serverNow: number,
  handlers: {
    apply: (skew: number) => void;
    onMeasured?: () => void;
    onStale?: () => void;
  },
): () => void {
  let stopped = false;
  const renderSkew = serverNow - Date.now();
  handlers.apply(renderSkew);

  void fetchClockSkew().then((measured) => {
    if (stopped || measured === null) return;
    handlers.apply(measured);
    handlers.onMeasured?.();
    if (measured - renderSkew > STALE_PAYLOAD_MS) handlers.onStale?.();
  });

  return () => {
    stopped = true;
  };
}
