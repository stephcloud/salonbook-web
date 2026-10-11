import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type ClientsOnlyNoticeProps = {
  /** 1 on its own page; 2 when shown inside a page that already has an h1. */
  headingLevel?: 1 | 2;
};

/** Shown to owners who open the booking wizard (the API refuses them with 403). */
export function ClientsOnlyNotice({
  headingLevel = 1,
}: ClientsOnlyNoticeProps) {
  const Heading = headingLevel === 2 ? "h2" : "h1";
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-2xl bg-card p-6 ring-1 ring-border"
    >
      <Heading className="text-2xl font-bold">Booking is for clients</Heading>
      <p className="text-muted-foreground">
        This account cannot make bookings. Salon owner accounts are for running
        a salon. Sign in with a client account to book, or go back to your
        dashboard.
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
