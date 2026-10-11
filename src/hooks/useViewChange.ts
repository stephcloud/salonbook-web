"use client";

import { useState } from "react";

/**
 * True once `view` is different from the one the page first showed. Panels use
 * it to move focus and announce a new result only after a real change, not on
 * the first paint.
 */
export function useViewChange(view: string): boolean {
  const [firstView] = useState(view);
  return view !== firstView;
}
