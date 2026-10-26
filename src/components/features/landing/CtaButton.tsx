import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Landing-only pill links (hero and final call to action) with a round icon
// badge on the right. They set their own padding and size, so the global
// `Button` look stays untouched. 52px tall: the 40px badge plus 6px each side.
const BASE =
  "group inline-flex min-h-13 w-full items-center justify-between gap-4 rounded-full border-2 py-1.5 pr-1.5 pl-6 text-base font-semibold whitespace-nowrap transition-colors motion-reduce:transition-none outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto";

const VARIANTS = {
  primary: {
    link: "border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary-dark",
    badge: "bg-secondary text-primary",
  },
  outline: {
    link: "border-primary bg-transparent text-primary hover:bg-primary/10 hover:text-primary-dark",
    badge: "bg-primary text-primary-foreground",
  },
} as const;

const ICONS = { search: Search, arrow: ArrowRight } as const;

export type CtaButtonProps = {
  href: string;
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  icon: keyof typeof ICONS;
};

export function CtaButton({
  href,
  children,
  variant = "primary",
  icon,
}: CtaButtonProps) {
  const Icon = ICONS[icon];
  return (
    <Link href={href} className={cn(BASE, VARIANTS[variant].link)}>
      {children}
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          VARIANTS[variant].badge,
        )}
      >
        <Icon
          aria-hidden="true"
          strokeWidth={2.2}
          className={cn(
            "size-5",
            icon === "arrow" &&
              "transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0",
          )}
        />
      </span>
    </Link>
  );
}
