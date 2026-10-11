"use client";

import { useState } from "react";

/**
 * True once `view` is different from the view the page first settled on. Panels
 * use it to move focus and announce a new result only after a real change, not
 * on the first paint.
 *
 * `placeholder` names a view that is only a stand-in until the page knows what
 * to show (for example "loading" while browser storage is read after
 * hydration). It never counts as the first view, so moving from it to the real
 * first view is not a change.
 */
export function useViewChange(view: string, placeholder?: string): boolean {
  const [firstView, setFirstView] = useState<string | null>(
    view === placeholder ? null : view,
  );
  if (firstView === null && view !== placeholder) {
    // Remember the first real view (state derived while rendering).
    setFirstView(view);
  }
  return firstView !== null && view !== firstView;
}
