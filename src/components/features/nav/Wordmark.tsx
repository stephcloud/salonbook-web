import Link from "next/link";
import { cn } from "@/lib/utils";

type WordmarkProps = {
  /** Placement only (where it sits on the page); the look stays shared. */
  className?: string;
};

/**
 * The SalonBook logo link, shared by the header, the footer and the sign-in and
 * register pages so they match. The S and B are bold italic in
 * `--brand-accent`, the rest is upright in `--primary`.
 *
 * The letters sit in one inner span, so the flex link has a single item and
 * they flow as one run of inline text: the accessible name stays "SalonBook"
 * (no spaces between flex items) and the kerning is kept. `px-2` leaves room
 * between the S and the ring at the pill's rounded ends.
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-2 font-heading text-2xl font-bold text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
    >
      <span>
        <span className="text-brand-accent italic">S</span>alon
        <span className="text-brand-accent italic">B</span>ook
      </span>
    </Link>
  );
}
