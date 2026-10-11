"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ActionRow,
  actionClass,
} from "@/components/features/payment/ActionRow";
import { BookingSummary } from "@/components/features/payment/BookingSummary";
import { Panel } from "@/components/features/payment/Panel";
import { useCountdown } from "@/hooks/useCountdown";
import { useSlowPending } from "@/hooks/useSlowPending";
import { useViewChange } from "@/hooks/useViewChange";
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

type View = "pay" | "checking" | "paid" | "expired" | "cancelled";

const TITLES: Record<View, string> = {
  pay: "Pay your deposit",
  checking: "Checking your booking...",
  paid: "Your booking is confirmed",
  expired: "This hold expired",
  cancelled: "This booking was cancelled",
};

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
  // last second. Until it answers, say "checking" rather than "expired".
  const rechecked = useRef(false);
  const [recheckDone, setRecheckDone] = useState(false);
  useEffect(() => {
    if (holdOver && !rechecked.current) {
      rechecked.current = true;
      void refetch().finally(() => setRecheckDone(true));
    }
  }, [holdOver, refetch]);

  // One request at a time. The ref closes the gap before React re-renders, so
  // two quick clicks cannot start two payments.
  const sending = useRef(false);
  const [redirecting, setRedirecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Coming back from Paystack with the Back button restores this page as it
  // was, with the button still "busy": make it usable again.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        sending.current = false;
        setRedirecting(false);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
      // not be told by the URL. If storage is blocked we still go (the
      // payment itself works) and that page points to My bookings instead.
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

  let view: View;
  if (outcome === "paid") view = "paid";
  else if (outcome === "ended") {
    // The API's word wins. Checked against the live API: an unpaid hold that
    // runs out becomes "cancelled" with no cancelled_at, while a cancel by the
    // client sets cancelled_at.
    view = booking.cancelled_at === null ? "expired" : "cancelled";
  } else if (holdOver) {
    view = recheckDone ? "expired" : "checking";
  } else view = "pay";

  const title = TITLES[view];
  // Move focus to the new screen and announce it, but not on the first paint.
  const changed = useViewChange(view);

  const busy = pay.isPending || redirecting || signedOut;
  const lastMinute = left <= 60_000;

  let body;
  if (view === "paid") {
    body = (
      <>
        <p className="text-muted-foreground">
          The deposit has been paid. See you at {booking.salon.name}.
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
  } else if (view === "checking") {
    body = (
      <p className="text-muted-foreground">
        The time to pay is up. We are checking whether your payment came
        through.
      </p>
    );
  } else if (view === "expired" || view === "cancelled") {
    body = (
      <>
        <p className="text-muted-foreground">
          {view === "expired"
            ? `A booking is held for ${HOLD_MINUTES} minutes while the deposit is unpaid, and that time is up. Pick a time again to book.`
            : "It was cancelled, so there is nothing to pay."}
        </p>
        <ActionRow>
          <Link href={`/salons/${booking.salon.id}`} className={actionClass()}>
            Back to {booking.salon.name}
          </Link>
          <Link href="/bookings" className={actionClass("outline")}>
            My bookings
          </Link>
        </ActionRow>
      </>
    );
  } else {
    body = (
      <>
        <div className="flex w-full flex-col gap-1 rounded-2xl bg-secondary p-4">
          <p id="time-left-label" className="text-sm font-medium">
            Time left to pay
          </p>
          <p
            role="timer"
            aria-labelledby="time-left-label"
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
          <BookingSummary booking={booking} depositLabel="Deposit due" />
        </div>
        <p className="text-sm text-muted-foreground">
          {refundRuleText(booking.salon.cancellation_hours)}
        </p>

        {outcome === "failed" ? (
          <p
            role="alert"
            className="flex items-start gap-2 font-semibold text-destructive"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0"
            />
            Your last payment did not go through. You can try again.
          </p>
        ) : null}
        {problem ? (
          <p
            role="alert"
            className="flex items-start gap-2 font-semibold text-destructive"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0"
            />
            {problem}
          </p>
        ) : null}

        <div className="flex w-full flex-col items-start gap-2">
          <Button
            size="lg"
            className="w-full disabled:cursor-wait disabled:opacity-100 sm:w-auto"
            onClick={startPayment}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <LoaderCircle
                aria-hidden="true"
                className="motion-safe:animate-spin"
              />
            ) : null}
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
      </>
    );
  }

  return (
    <>
      {/* Always present, so a new screen is announced reliably. */}
      <p role="status" className="sr-only">
        {changed ? title : ""}
      </p>
      <Panel key={view} title={title} focusOnMount={changed}>
        {body}
      </Panel>
    </>
  );
}
