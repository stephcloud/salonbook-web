"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  children: ReactNode;
};

/** A header link that marks the page you are on (and the pages under it). */
export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring",
        active && "bg-secondary font-semibold",
      )}
    >
      {children}
    </Link>
  );
}
