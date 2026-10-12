"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ANNOUNCE_DELAY_MS = 50;

/**
 * A short success message for a live region. Showing the same text twice in a
 * row is announced again (the text is cleared for a moment first, because a
 * screen reader only speaks a region whose text changes), and the message
 * goes away by itself after `clearAfterMs`.
 */
export function useNotice(clearAfterMs = 8000) {
  const [text, setText] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const show = useCallback(
    (message: string) => {
      stop();
      setText("");
      timers.current = [
        setTimeout(() => setText(message), ANNOUNCE_DELAY_MS),
        setTimeout(() => setText(""), ANNOUNCE_DELAY_MS + clearAfterMs),
      ];
    },
    [stop, clearAfterMs],
  );

  useEffect(() => stop, [stop]);

  return [text, show] as const;
}
