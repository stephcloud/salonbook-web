"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  children: ReactNode;
};

/**
 * A header link that marks where you are: `aria-current="page"` on the exact
 * page, `"true"` on a page inside that section (for example the pay page under
 * My bookings).
 */
export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const exact = pathname === href;
  const inSection = !exact && pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={exact ? "page" : inSection ? "true" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring",
        (exact || inSection) && "bg-secondary font-semibold",
      )}
    >
      {children}
    </Link>
  );
}
