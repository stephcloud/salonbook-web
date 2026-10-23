"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { HOME_ANCHORS } from "@/lib/landing-content";

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium outline-none hover:bg-secondary hover:text-primary-dark focus-visible:ring-3 focus-visible:ring-ring";

/**
 * Section links for the landing page, shown only on `/`. From `md` up they sit
 * in the header row; on a phone they open from a Menu button.
 */
export function HomeAnchors() {
  const pathname = usePathname();
  // Open only for the page it was opened on, so it is closed again on return.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const open = pathname === "/" && openPath === pathname;

  // A tap or click anywhere else closes it, so it never sits over the page.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpenPath(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (pathname !== "/") return null;

  return (
    <div
      ref={wrapperRef}
      className="contents md:flex md:items-center md:gap-1"
      onBlur={(event) => {
        // Focus moving to something outside (tabbing past the last link)
        // closes it too. No `relatedTarget` means a click that focused
        // nothing (Safari does not focus a clicked link); the pointerdown
        // listener handles clicks, so closing here could swallow the link.
        const next = event.relatedTarget;
        if (open && next && !event.currentTarget.contains(next)) {
          setOpenPath(null);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpenPath(null);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="home-anchors"
        onClick={() => setOpenPath(open ? null : pathname)}
        className={`${LINK_CLASS} gap-2 md:hidden`}
      >
        {open ? (
          <X aria-hidden="true" className="size-4" />
        ) : (
          <Menu aria-hidden="true" className="size-4" />
        )}
        Menu
      </button>
      <ul
        id="home-anchors"
        aria-label="Sections"
        className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-1 border-b border-border bg-card px-4 py-2 shadow-md md:static md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {HOME_ANCHORS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={() => setOpenPath(null)}
              className={LINK_CLASS}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
