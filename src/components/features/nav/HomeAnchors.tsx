"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { HOME_ANCHORS } from "@/lib/landing-content";

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring";

/**
 * Section links for the landing page, shown only on `/`. From `md` up they sit
 * in the header row; on a phone they open from a Menu button.
 */
export function HomeAnchors() {
  const pathname = usePathname();
  // Open only for the page it was opened on, so it is closed again on return.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (pathname !== "/") return null;
  const open = openPath === pathname;

  return (
    <div
      className="contents md:flex md:items-center md:gap-1"
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
        className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full z-40 flex-col gap-1 border-b border-border bg-card px-4 py-2 shadow-md md:static md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
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
