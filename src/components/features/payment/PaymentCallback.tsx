"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { BookingSummary } from "@/components/features/payment/BookingSummary";
import { usePaymentConfirmation } from "@/hooks/usePaymentConfirmation";
import { useSavedBookingId } from "@/hooks/useSavedBookingId";
import { clearPendingBookingId } from "@/lib/payment-storage";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

function LinkRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

/**
 * Where Paystack sends the client back to. It never reads the URL: the
 * booking id comes from sessionStorage (saved before leaving for Paystack)
 * and the result comes from the API, not from the redirect.
 */
export function PaymentCallback() {
  // undefined = storage not read yet (it only exists in the browser).
  const bookingId = useSavedBookingId();

  const { phase, booking, trouble, checkAgain } = usePaymentConfirmation(
    bookingId ?? null,
  );
  const ready = bookingId !== undefined;

  // Clear the saved id once the outcome is known. After the time limit it
  // stays, so a refresh can pick the check up again.
  useEffect(() => {
    if (
      ready &&
      (phase === "paid" ||
        phase === "failed" ||
        phase === "ended" ||
        phase === "not-found")
    ) {
      clearPendingBookingId();
    }
  }, [ready, phase]);

  if (ready && phase === "no-booking") {
    return (
      <Panel title="We could not find a payment to check">
        <p className="text-muted-foreground">
          This page confirms a payment right after you pay. Open My Bookings to
          see the latest status of your bookings.
        </p>
        <LinkRow>
          <Link href="/bookings" className={buttonVariants({ size: "lg" })}>
            My Bookings
          </Link>
          <Link
            href="/salons"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Browse salons
          </Link>
        </LinkRow>
      </Panel>
    );
  }

  if (ready && phase === "paid" && booking) {
    return (
      <Panel title="Payment received. Your booking is confirmed.">
        <p role="status" className="text-muted-foreground">
          Your deposit has been paid and your appointment is booked.
        </p>
        <div className="w-full">
          <BookingSummary booking={booking} />
        </div>
        <LinkRow>
          <Link href="/bookings" className={buttonVariants({ size: "lg" })}>
            View my bookings
          </Link>
        </LinkRow>
      </Panel>
    );
  }

  if (ready && phase === "failed" && booking) {
    return (
      <Panel title="Your payment did not go through">
        <p role="status" className="text-muted-foreground">
          The deposit was not taken. You can try again while your booking is
          still held.
        </p>
        <LinkRow>
          <Link
            href={`/bookings/${booking.id}/pay`}
            className={buttonVariants({ size: "lg" })}
          >
            Try again
          </Link>
          <Link
            href="/bookings"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            My Bookings
          </Link>
        </LinkRow>
      </Panel>
    );
  }

  if (ready && phase === "ended" && booking) {
    return (
      <Panel title="This booking is no longer open">
        <p role="status" className="text-muted-foreground">
          The hold ended or the booking was cancelled before the payment was
          confirmed. If you were charged, please contact {booking.salon.name} on{" "}
          {booking.salon.phone}.
        </p>
        <LinkRow>
          <Link
            href={`/book/${booking.salon.id}`}
            className={buttonVariants({ size: "lg" })}
          >
            Book again
          </Link>
          <Link
            href="/bookings"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            My Bookings
          </Link>
        </LinkRow>
      </Panel>
    );
  }

  if (ready && phase === "not-found") {
    return (
      <Panel title="We could not find this booking">
        <p role="status" className="text-muted-foreground">
          It may belong to another account. Open My Bookings to see yours.
        </p>
        <LinkRow>
          <Link href="/bookings" className={buttonVariants({ size: "lg" })}>
            My Bookings
          </Link>
        </LinkRow>
      </Panel>
    );
  }

  if (ready && phase === "slow") {
    return (
      <Panel title="Your payment is still being processed">
        <p role="status" className="text-muted-foreground">
          This is taking a little longer than usual. There is nothing more you
          need to do. Check My Bookings in a minute to see the result.
        </p>
        <LinkRow>
          <Link href="/bookings" className={buttonVariants({ size: "lg" })}>
            My Bookings
          </Link>
          <Button variant="outline" size="lg" onClick={checkAgain}>
            Check again
          </Button>
        </LinkRow>
      </Panel>
    );
  }

  return (
    <Panel title="Confirming your payment">
      <p role="status" className="text-muted-foreground">
        Please wait while we confirm your payment. This usually takes a few
        seconds.
      </p>
      {trouble ? (
        <p className="text-sm text-muted-foreground">
          We are having trouble reaching the server. We will keep trying.
        </p>
      ) : null}
    </Panel>
  );
}
