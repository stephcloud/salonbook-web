import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shown to signed-in clients who open an owner page (403). */
export function OwnersOnlyNotice() {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-2xl bg-card p-6 ring-1 ring-border"
    >
      <h1 className="text-2xl font-bold">This area is for salon owners</h1>
      <p className="text-muted-foreground">
        Your account is set up for booking appointments. Browse salons to book
        your next visit.
      </p>
      <Link href="/salons" className={cn(buttonVariants({ size: "lg" }))}>
        Browse salons
      </Link>
    </div>
  );
}
