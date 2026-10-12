"use client";

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

/** Links between the owner pages; the current one is marked with aria-current. */
export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard">
      <ul className="flex flex-wrap gap-1">
        {LINKS.map(({ href, label }) => {
          const current = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring",
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
