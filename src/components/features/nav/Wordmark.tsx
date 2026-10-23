import Link from "next/link";
import { cn } from "@/lib/utils";

type WordmarkProps = {
  /** Layout only (placement in the header or footer); the look stays shared. */
  className?: string;
};

/**
 * The SalonBook logo link, shared by the header and the footer so they match.
 * The S and B are bold italic in `--brand-accent`, the rest is upright in
 * `--primary`. It stays one run of text, so the link's accessible name is
 * "SalonBook".
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-1 font-heading text-2xl font-bold text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="text-brand-accent italic">S</span>alon
      <span className="text-brand-accent italic">B</span>ook
    </Link>
  );
}
