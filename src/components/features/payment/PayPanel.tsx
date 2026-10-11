"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { BookingSummary } from "@/components/features/payment/BookingSummary";
import { useCountdown } from "@/hooks/useCountdown";
import { useSlowPending } from "@/hooks/useSlowPending";
import { getBooking, payBooking, type BookingDetail } from "@/lib/api";
import { bookingOutcome } from "@/lib/booking-outcome";
import { formatCountdown, HOLD_MINUTES } from "@/lib/hold";
import { leaveTo } from "@/lib/navigate";
import { classifyPayError } from "@/lib/payment-errors";
import { savePendingBookingId } from "@/lib/payment-storage";
import { isSafeCheckoutUrl } from "@/lib/paystack-url";
import { refundRuleText } from "@/lib/refund";

type PayPanelProps = {
  /** The booking as the server read it. */
  initialBooking: BookingDetail;
  /** The server's clock (ms) when it read the booking; corrects a wrong device clock. */
  serverNow: number;
};

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

export function PayPanel({ initialBooking, serverNow }: PayPanelProps) {
  const id = initialBooking.id;

  // The booking from the server, re-read on demand (never on a timer): when
  // the countdown ends, or when paying says the booking is closed.
  const { data: booking, refetch } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => getBooking(id),
    initialData: initialBooking,
    enabled: false,
    staleTime: Infinity,
  });

  const left = useCountdown(booking.created_at, serverNow);
  const outcome = bookingOutcome(booking);
  const holdOver = left <= 0;

  // When the countdown reaches zero, ask the API once instead of trusting
  // this device's clock: the booking may have been cancelled, or paid at the
  // last second.
  const rechecked = useRef(false);
  useEffect(() => {
    if (holdOver && !rechecked.current) {
      rechecked.current = true;
      void refetch();
    }
  }, [holdOver, refetch]);

  // One request at a time. The ref closes the gap before React re-renders, so
  // two quick clicks cannot start two payments.
  const sending = useRef(false);
  const [redirecting, setRedirecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const pay = useMutation({
    mutationFn: () => payBooking(id),
    onSuccess: (payment) => {
      if (!isSafeCheckoutUrl(payment.authorization_url)) {
        sending.current = false;
        setProblem(
          "We could not open the payment page. Please try again in a moment.",
        );
        return;
      }
      // Remember which booking this is: the page Paystack returns to will
      // not be told by the URL.
      savePendingBookingId(id);
      setRedirecting(true);
      leaveTo(payment.authorization_url);
    },
    onError: (error) => {
      const failure = classifyPayError(error);
      if (failure.kind === "signed-out") {
        // apiFetch is already sending the client to /login: stay quiet and disabled.
        setSignedOut(true);
        return;
      }
      sending.current = false;
      if (failure.kind === "closed") {
        // The booking says whether it was paid, cancelled or the hold ended.
        void refetch();
        setProblem(failure.message);
      } else if (failure.kind === "not-found") {
        setProblem("We could not find this booking in your account.");
      } else {
        setProblem(failure.message);
      }
    },
  });
  const waking = useSlowPending(pay.isPending);

  function startPayment() {
    if (sending.current || pay.isPending || redirecting || signedOut) return;
    sending.current = true;
    setProblem(null);
    pay.mutate();
  }

  if (outcome === "paid") {
    return (
      <Panel title="Your booking is confirmed">
        <p role="status" className="text-muted-foreground">
          The deposit has been paid. See you at {booking.salon.name}.
        </p>
        <div className="w-full">
          <BookingSummary booking={booking} />
        </div>
        <Link href="/bookings" className={buttonVariants({ size: "lg" })}>
          View my bookings
        </Link>
      </Panel>
    );
  }

  if (outcome === "ended" || holdOver) {
    // The API's word wins. Checked against the live API: an unpaid hold that
    // runs out becomes "cancelled" with no cancelled_at, while a cancel by the
    // client sets cancelled_at. A pending booking whose clock ran out is
    // expired while we wait for the API to catch up.
    const expired =
      outcome === "ended" ? booking.cancelled_at === null : holdOver;
    return (
      <Panel
        title={expired ? "This hold expired" : "This booking was cancelled"}
      >
        <p role="status" className="text-muted-foreground">
          {expired
            ? `A booking is held for ${HOLD_MINUTES} minutes while the deposit is unpaid, and that time is up. Pick a time again to book.`
            : "It was cancelled, so there is nothing to pay."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/salons/${booking.salon.id}`}
            className={buttonVariants({ size: "lg" })}
          >
            Back to {booking.salon.name}
          </Link>
          <Link
            href="/bookings"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            My Bookings
          </Link>
        </div>
      </Panel>
    );
  }

  const busy = pay.isPending || redirecting || signedOut;
  const lastMinute = left <= 60_000;

  return (
    <Panel title="Pay your deposit">
      <div className="flex w-full flex-col gap-1 rounded-2xl bg-secondary p-4">
        <p className="text-sm font-medium">Time left to pay</p>
        <p
          role="timer"
          aria-label="Time left to pay"
          className="text-3xl font-bold tabular-nums"
        >
          {formatCountdown(left)}
        </p>
        <p className="text-sm text-muted-foreground">
          Your time is held for {HOLD_MINUTES} minutes from when you booked.
        </p>
      </div>
      <p role="status" className="sr-only">
        {lastMinute ? "Less than a minute left to pay." : ""}
      </p>

      <div className="w-full">
        <BookingSummary booking={booking} />
      </div>
      <p className="text-sm text-muted-foreground">
        {refundRuleText(booking.salon.cancellation_hours)}
      </p>

      {outcome === "failed" ? (
        <p role="alert" className="font-semibold">
          Your last payment did not go through. You can try again.
        </p>
      ) : null}
      {problem ? (
        <p role="alert" className="font-semibold text-destructive">
          {problem}
        </p>
      ) : null}

      <div className="flex flex-col items-start gap-2">
        <Button size="lg" onClick={startPayment} disabled={busy}>
          {redirecting
            ? "Taking you to Paystack..."
            : signedOut
              ? "Redirecting you to sign in..."
              : pay.isPending
                ? "Starting payment..."
                : "Pay deposit"}
        </Button>
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {waking
            ? "Waking up the server... this can take up to a minute."
            : ""}
        </p>
      </div>
    </Panel>
  );
}
