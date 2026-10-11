"use client";

import { useEffect, useRef, type ReactNode } from "react";

type PanelProps = {
  title: string;
  /** Move focus to the title when the panel appears (after a change, not on first paint). */
  focusOnMount?: boolean;
  children: ReactNode;
};

/** One screen of the payment flow: the page's only h1 and what follows it. */
export function Panel({ title, focusOnMount = false, children }: PanelProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <h1
        ref={heading}
        tabIndex={-1}
        className="rounded text-2xl font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {title}
      </h1>
      {children}
    </div>
  );
}
