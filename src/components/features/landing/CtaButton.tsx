import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Landing-only pill links (hero, final call to action and the who-it's-for
// cards; `light` sits on the plum card) with a round icon
// badge on the right. They set their own padding and size, so the global
// `Button` look stays untouched; the focus ring copies `button.tsx`, keep the
// two in step. 56px tall: 40px badge + 12px padding + 4px border, with a 44px
// floor. `outline-hidden` (not `outline-none`) keeps a focus outline in
// Windows high-contrast mode, which drops the box-shadow ring. Labels may wrap
// on very narrow screens rather than run into the badge.
const BASE =
  "group inline-flex min-h-11 w-full items-center justify-between gap-4 rounded-full border-2 py-1.5 pr-1.5 pl-6 text-left text-base leading-tight font-semibold transition-colors motion-reduce:transition-none outline-hidden focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto";

const VARIANTS = {
  primary: {
    link: "border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary-dark",
    badge: "bg-secondary text-primary",
  },
  outline: {
    link: "border-primary bg-transparent text-primary hover:bg-primary/10 hover:text-primary-dark",
    badge: "bg-primary text-primary-foreground",
  },
  // For plum panels: a white ring with a plum gap, since plum on plum is invisible.
  light: {
    link: "border-transparent bg-card text-primary hover:bg-secondary focus-visible:ring-primary-foreground focus-visible:ring-offset-primary",
    badge: "bg-primary text-primary-foreground",
  },
} as const;

const ICONS = { search: Search, arrow: ArrowRight } as const;

type CtaButtonProps = {
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
          data-icon={icon}
          strokeWidth={2.2}
          className={cn(
            "size-5",
            icon === "arrow" &&
              "transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0",
          )}
        />
      </span>
    </Link>
  );
}
