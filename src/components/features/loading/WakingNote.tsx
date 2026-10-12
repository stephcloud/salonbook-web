"use client";

import { useSlowPending } from "@/hooks/useSlowPending";

/** Mounted only while a page is loading: after a few seconds it explains the wait. */
export function WakingNote() {
  const slow = useSlowPending(true);
  if (!slow) return null;
  return (
    <>
      <p className="font-semibold">Waking up the server...</p>
      <p className="text-muted-foreground">
        The first visit after a quiet spell can take up to a minute.
      </p>
    </>
  );
}
