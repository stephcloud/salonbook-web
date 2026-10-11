"use client";

import { useEffect, useState } from "react";

/** True once `pending` has lasted longer than `delayMs` (default 4 seconds). */
export function useSlowPending(pending: boolean, delayMs = 4000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      const reset = setTimeout(() => setSlow(false), 0);
      return () => clearTimeout(reset);
    }
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [pending, delayMs]);

  return pending && slow;
}
