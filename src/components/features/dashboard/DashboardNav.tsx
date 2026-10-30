"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/stylists", label: "Stylists" },
  { href: "/dashboard/availability", label: "Weekly hours" },
  { href: "/dashboard/bookings", label: "Bookings" },
];

/**
 * Links between the owner pages; the current one is marked with aria-current.
 * One row that scrolls sideways on phones (it would wrap to two rows), running
 * to the screen edges, with the current link scrolled into view.
 */
export function DashboardNav() {
  const pathname = usePathname();
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const row = list.current;
    const current = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !current) return;
    // Scroll the row only, not the page (scrollIntoView could move both).
    row.scrollLeft =
      current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav aria-label="Dashboard" className="-mx-4 sm:mx-0">
      <ul
        ref={list}
        className="flex gap-1 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {LINKS.map(({ href, label }) => {
          const current = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none hover:bg-secondary hover:text-primary-dark focus-visible:ring-3 focus-visible:ring-ring",
                  current && "bg-secondary font-semibold",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
