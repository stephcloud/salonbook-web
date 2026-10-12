"use client";

import { useEffect } from "react";

export const UNSAVED_MESSAGE =
  "You have unsaved changes. If you leave, they will be lost.";

/**
 * While `dirty`, the browser asks before the tab is closed or reloaded, and a
 * click on a link to another page asks first. (Next.js has no hook for the
 * back button, so that case only gets the browser's own prompt on a reload.)
 */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Older browsers need a return value to show their prompt.
      event.returnValue = "";
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Links, and buttons that leave the page on their own (such as Sign out).
      const link = target.closest("a[href], [data-leaves-page]");
      if (!link || link.getAttribute("target") === "_blank") return;
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#")) return;
      if (!window.confirm(UNSAVED_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    // Capture phase, so this runs before the Next.js link handler navigates.
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}
