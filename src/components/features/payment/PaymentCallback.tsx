"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ActionRow,
  actionClass,
} from "@/components/features/payment/ActionRow";
import { BookingSummary } from "@/components/features/payment/BookingSummary";
import { Panel } from "@/components/features/payment/Panel";
import { usePaymentConfirmation } from "@/hooks/usePaymentConfirmation";
import { useSavedBookingId } from "@/hooks/useSavedBookingId";
import { useViewChange } from "@/hooks/useViewChange";
import { clearPendingBookingId } from "@/lib/payment-storage";

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
    >
      {phone}
    </a>
  );
}

const TITLES = {
  loading: "Loading...",
  "no-booking": "Nothing to confirm here",
  confirming: "Confirming your payment",
  paid: "Payment received. Your booking is confirmed.",
  failed: "Your payment did not go through",
  ended: "This booking is no longer open",
  "not-found": "This booking is not on your account",
  slow: "Your payment is still being processed",
  "signed-out": "Redirecting you to sign in",
} as const;

/**
 * Where Paystack sends the client back to. It never reads the URL: the
 * booking id comes from sessionStorage (saved before leaving for Paystack)
 * and the result comes from the API, not from the redirect.
 */
export function PaymentCallback() {
  // undefined = storage not read yet (it only exists in the browser).
  const bookingId = useSavedBookingId();
  const ready = bookingId !== undefined;

  const { phase, booking, trouble, checkAgain } = usePaymentConfirmation(
    bookingId ?? null,
  );

  // Clear the saved id once the outcome is known. After the time limit (or a
  // sign-in redirect) it stays, so the check can pick up again.
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

  const view = !ready ? "loading" : phase;
  const title = TITLES[view];
  // Move focus to the new result and announce it, but not on the first paint.
  // "loading" is only the stand-in shown until storage is read after hydration.
  const changed = useViewChange(view, "loading");

  let body = null;
  if (view === "loading") {
    body = <p className="text-muted-foreground">One moment.</p>;
  } else if (view === "no-booking") {
    body = (
      <>
        <p className="text-muted-foreground">
          This page confirms a payment right after you pay. If you just paid,
          your payment is safe. Open My bookings in a minute to see your
          booking.
        </p>
        <ActionRow>
          <Link href="/bookings" className={actionClass()}>
            My bookings
          </Link>
          <Link href="/salons" className={actionClass("outline")}>
            Browse salons
          </Link>
        </ActionRow>
      </>
    );
  } else if (view === "paid" && booking) {
    body = (
      <>
        <p className="text-muted-foreground">
          Your deposit has been paid and your appointment is booked.
        </p>
        <div className="w-full">
          <BookingSummary booking={booking} depositLabel="Deposit paid" />
        </div>
        <ActionRow>
          <Link href="/bookings" className={actionClass()}>
            View my bookings
          </Link>
        </ActionRow>
      </>
    );
  } else if (view === "failed" && booking) {
    body = (
      <>
        <p className="text-muted-foreground">
          We did not receive your deposit. You can try again while your booking
          is still held.
        </p>
        <ActionRow>
          <Link href={`/bookings/${booking.id}/pay`} className={actionClass()}>
            Try again
          </Link>
          <Link href="/bookings" className={actionClass("outline")}>
            My bookings
          </Link>
        </ActionRow>
      </>
    );
  } else if (view === "ended" && booking) {
    body = (
      <>
        <p className="text-muted-foreground">
          The hold ended or the booking was cancelled before the payment was
          confirmed. If you were charged, please contact {booking.salon.name} on{" "}
          <PhoneLink phone={booking.salon.phone} />.
        </p>
        <ActionRow>
          <Link href={`/book/${booking.salon.id}`} className={actionClass()}>
            Book again
          </Link>
          <Link href="/bookings" className={actionClass("outline")}>
            My bookings
          </Link>
        </ActionRow>
      </>
    );
  } else if (view === "not-found") {
    body = (
      <>
        <p className="text-muted-foreground">Open My bookings to see yours.</p>
        <ActionRow>
          <Link href="/bookings" className={actionClass()}>
            My bookings
          </Link>
        </ActionRow>
      </>
    );
  } else if (view === "slow") {
    body = (
      <>
        <p className="text-muted-foreground">
          This is taking a little longer than usual. There is nothing more you
          need to do, and please do not pay again. Check My bookings in a minute
          to see the result.
        </p>
        <ActionRow>
          <Link href="/bookings" className={actionClass()}>
            My bookings
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={checkAgain}
          >
            Check again
          </Button>
        </ActionRow>
      </>
    );
  } else if (view === "signed-out") {
    body = (
      <p className="text-muted-foreground">
        Your session ended. Sign in again and we will check your payment.
      </p>
    );
  } else {
    body = (
      <>
        <p className="text-muted-foreground">
          Please wait while we confirm your payment. This usually takes a few
          seconds. Please do not pay again.
        </p>
        {trouble ? (
          <p role="status" className="text-sm text-muted-foreground">
            We are having trouble reaching the server. We will keep trying.
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      {/* Always present, so a new result is announced reliably. */}
      <p role="status" className="sr-only">
        {changed ? title : ""}
      </p>
      <Panel key={view} title={title} focusOnMount={changed}>
        {body}
      </Panel>
    </>
  );
}
