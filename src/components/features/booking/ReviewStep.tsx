"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { ClientsOnlyNotice } from "@/components/features/booking/ClientsOnlyNotice";
import { StepHeading } from "@/components/features/booking/StepHeading";
import {
  SUMMARY_LIST_CLASS,
  SummaryRow,
} from "@/components/features/booking/SummaryRow";
import { useSlowPending } from "@/hooks/useSlowPending";
import {
  createBooking,
  type BookingInput,
  type Salon,
  type Service,
  type Stylist,
} from "@/lib/api";
import { classifyBookingError } from "@/lib/booking-errors";
import { formatNaira } from "@/lib/money";
import { formatDuration, formatServicePrice } from "@/lib/price";
import { refundRuleText } from "@/lib/refund";
import { formatLagosDateTime } from "@/lib/time";

type ReviewStepProps = {
  salon: Salon;
  service: Service;
  stylist: Stylist;
  /** The slot string exactly as the API gave it; sent unchanged as starts_at. */
  slot: string;
  onBack: () => void;
  /** The API said the time is gone (409): the wizard goes back to the slot step. */
  onSlotTaken: (message: string) => void;
};

const FIELD_LABELS: Record<string, string> = {
  starts_at: "Time",
  stylist_id: "Stylist",
  service_id: "Service",
};

export function ReviewStep({
  salon,
  service,
  stylist,
  slot,
  onBack,
  onSlotTaken,
}: ReviewStepProps) {
  const router = useRouter();
  // The ref closes the gap before React re-renders, so two quick clicks send one request.
  const sending = useRef(false);

  const mutation = useMutation({
    mutationFn: (input: BookingInput) => createBooking(input),
    onSuccess: (booking) => {
      router.push(`/bookings/${booking.id}/pay`);
    },
    onError: (error) => {
      const failure = classifyBookingError(error);
      // On a 401 apiFetch is already redirecting to /login: stay disabled.
      if (failure.kind !== "signed-out") sending.current = false;
      if (failure.kind === "slot-taken") onSlotTaken(failure.message);
    },
  });
  const waking = useSlowPending(mutation.isPending);

  function confirm() {
    if (sending.current || mutation.isPending || mutation.isSuccess) return;
    sending.current = true;
    mutation.mutate({
      stylist_id: stylist.id,
      service_id: service.id,
      starts_at: slot,
    });
  }

  const failure = mutation.isError
    ? classifyBookingError(mutation.error)
    : null;
  // Confirming again cannot work while the salon is not taking bookings.
  const salonClosed = failure?.kind === "salon-closed";
  // Confirm is disabled while it has focus; move focus to the reason instead.
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (salonClosed) alertRef.current?.focus();
  }, [salonClosed]);

  if (failure?.kind === "clients-only") {
    return <ClientsOnlyNotice headingLevel={2} />;
  }

  const busy =
    mutation.isPending || mutation.isSuccess || failure?.kind === "signed-out";
  const status = mutation.isSuccess
    ? "Taking you to payment..."
    : failure?.kind === "signed-out"
      ? failure.message
      : waking
        ? "Waking up the server... this can take up to a minute."
        : mutation.isPending
          ? "Creating your booking..."
          : "";

  return (
    <div className="flex flex-col gap-4">
      <StepHeading id="step-review-heading">Review your booking</StepHeading>

      <dl className={SUMMARY_LIST_CLASS}>
        <SummaryRow label="Salon">
          <span className="font-semibold">{salon.name}</span>
          <br />
          <span className="text-sm text-muted-foreground">{salon.address}</span>
        </SummaryRow>
        <SummaryRow label="Service">
          <span className="font-semibold">{service.name}</span>{" "}
          <span className="text-sm text-muted-foreground">
            ({formatDuration(service.duration_minutes)})
          </span>
        </SummaryRow>
        <SummaryRow label="Stylist">
          <span className="font-semibold">{stylist.name}</span>
        </SummaryRow>
        <SummaryRow label="When">
          <span className="font-semibold">{formatLagosDateTime(slot)}</span>
        </SummaryRow>
        <SummaryRow label="Price">
          <span className="font-semibold">{formatServicePrice(service)}</span>
        </SummaryRow>
        <SummaryRow label="Deposit to pay now">
          <span className="font-semibold">
            {formatNaira(salon.deposit_amount)}
          </span>
        </SummaryRow>
      </dl>

      <p className="text-sm text-muted-foreground">
        {refundRuleText(salon.cancellation_hours)} Your booking is held for 15
        minutes while you pay the deposit.
      </p>

      {failure && failure.kind !== "signed-out" ? (
        <div
          ref={alertRef}
          id="review-error"
          tabIndex={-1}
          role="alert"
          className="flex flex-col items-start gap-2 rounded-2xl bg-card p-4 ring-1 ring-destructive/40"
        >
          {failure.kind === "pending-limit" ? (
            <>
              <p className="font-semibold">{failure.message}</p>
              <p className="text-sm">
                Pay or cancel one of your pending bookings, or wait for an
                unpaid one to expire, then try again.
              </p>
              <Link
                href="/bookings"
                className={buttonVariants({ variant: "outline" })}
              >
                View my bookings
              </Link>
            </>
          ) : failure.kind === "salon-closed" ? (
            <>
              <p className="font-semibold">{failure.message}</p>
              <p className="text-sm">
                Please try again later or choose another salon.
              </p>
              <Link
                href="/salons"
                className={buttonVariants({ variant: "outline" })}
              >
                Browse salons
              </Link>
            </>
          ) : failure.kind === "invalid" ? (
            <>
              <p className="font-semibold">
                The server could not accept this booking.
              </p>
              {Object.keys(failure.fieldErrors).length > 0 ? (
                <ul className="list-disc pl-5 text-sm">
                  {Object.entries(failure.fieldErrors).map(
                    ([field, message]) => (
                      <li key={field}>
                        {FIELD_LABELS[field]
                          ? `${FIELD_LABELS[field]}: ${message}`
                          : message}
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="text-sm">{failure.message}</p>
              )}
            </>
          ) : (
            <p className="font-semibold">{failure.message}</p>
          )}
        </div>
      ) : null}

      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {status}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="lg" onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button
          size="lg"
          onClick={confirm}
          disabled={busy || salonClosed}
          aria-describedby={salonClosed ? "review-error" : undefined}
        >
          {busy ? "Creating booking..." : "Confirm booking"}
        </Button>
      </div>
    </div>
  );
}
