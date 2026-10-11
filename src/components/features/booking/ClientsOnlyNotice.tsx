import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Shown to owners who open the booking wizard (the API refuses them with 403). */
export function ClientsOnlyNotice() {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-2xl bg-card p-6 ring-1 ring-border"
    >
      <h1 className="text-2xl font-bold">Booking is for clients</h1>
      <p className="text-muted-foreground">
        Salon owner accounts cannot book appointments. Sign in with a client
        account to book, or go back to your dashboard.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
          Go to dashboard
        </Link>
        <Link
          href="/salons"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Browse salons
        </Link>
      </div>
    </div>
  );
}
