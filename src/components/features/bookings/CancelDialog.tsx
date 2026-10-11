"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  cancelBooking,
  getBooking,
  type Booking,
  type BookingListItem,
} from "@/lib/api";
import { classifyCancelError, type CancelFailure } from "@/lib/cancel-errors";
import { cancelOutcome, type CancelOutcome } from "@/lib/cancel-outcome";
import { refundRuleText } from "@/lib/refund";
import { formatLagosDateTime } from "@/lib/time";

/** How long a sign-in redirect may take before the dialog lets go. */
const SIGN_IN_REDIRECT_MS = 10_000;

export type CancelResult = {
  /** The booking as it was before cancelling. */
  previous: BookingListItem;
  /** The API's answer, including refund_due. */
  cancelled: Booking;
  outcome: CancelOutcome;
};

type CancelDialogProps = {
  /** The booking to cancel; null keeps the dialog closed. */
  booking: BookingListItem | null;
  onClose: () => void;
  onCancelled: (result: CancelResult) => void;
  /** The API said this booking is not there or not cancellable: refresh the list. */
  onStale: () => void;
};

type BodyProps = Omit<CancelDialogProps, "booking" | "onClose"> & {
  booking: BookingListItem;
  /** True while a cancel request is in flight, so the dialog cannot be dismissed. */
  busyRef: RefObject<boolean>;
};

const PAID_STATUSES = new Set(["paid", "refund_pending", "refunded"]);

/**
 * Whether a deposit was paid for a booking the list showed as unpaid. The list
 * can be a little old (the payment may have gone through in another tab or a
 * late webhook), and the cancel answer alone cannot tell "paid but inside the
 * window" from "never paid", so look. null means it could not be checked.
 */
async function readWasPaid(id: string): Promise<boolean | null> {
  try {
    const detail = await getBooking(id);
    return PAID_STATUSES.has(detail.payment_status ?? "");
  } catch {
    return null;
  }
}

function CancelDialogBody({
  booking,
  busyRef,
  onCancelled,
  onStale,
}: BodyProps) {
  // One request at a time. The ref closes the gap before React re-renders, so
  // two quick clicks cannot cancel twice.
  const sending = useRef(false);
  const [failure, setFailure] = useState<Exclude<
    CancelFailure,
    { kind: "signed-out" }
  > | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
    },
    [],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const cancelled = await cancelBooking(booking.id);
      const wasPaid =
        booking.status === "confirmed" || cancelled.refund_due === true
          ? true
          : await readWasPaid(booking.id);
      return { cancelled, wasPaid };
    },
    onSuccess: ({ cancelled, wasPaid }) => {
      busyRef.current = false;
      const outcome = cancelOutcome({
        wasPaid,
        refundDue: cancelled.refund_due,
        cancellationHours: booking.salon.cancellation_hours,
      });
      onCancelled({ previous: booking, cancelled, outcome });
    },
    onError: (error) => {
      const result = classifyCancelError(error);
      if (result.kind === "signed-out") {
        // apiFetch is already sending the client to /login. If the redirect
        // never happens, let go after a while so the dialog is not stuck.
        setSignedOut(true);
        releaseTimer.current = setTimeout(() => {
          sending.current = false;
          busyRef.current = false;
          setSignedOut(false);
        }, SIGN_IN_REDIRECT_MS);
        return;
      }
      sending.current = false;
      busyRef.current = false;
      setFailure(result);
      if (result.kind === "not-found" || result.kind === "refused") onStale();
    },
  });

  function confirm() {
    if (sending.current || mutation.isPending || signedOut) return;
    sending.current = true;
    busyRef.current = true;
    setFailure(null);
    mutation.mutate();
  }

  const busy = mutation.isPending || signedOut;
  const paid = booking.status === "confirmed";
  // The booking is gone or cannot be cancelled: another try would fail the
  // same way, so the only thing left to do is close.
  const stale = failure?.kind === "not-found" || failure?.kind === "refused";

  return (
    <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-sm">
      <AlertDialogHeader className="place-items-start text-left">
        <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
        <AlertDialogDescription render={<div />}>
          <p>
            {booking.service.name} with {booking.stylist.name} at{" "}
            {booking.salon.name}, {formatLagosDateTime(booking.starts_at)}.
          </p>
          <p className="mt-2">
            {paid
              ? `${refundRuleText(booking.salon.cancellation_hours)} We will tell you the result as soon as it is cancelled.`
              : "You have not paid a deposit, so nothing will be charged."}
          </p>
        </AlertDialogDescription>
      </AlertDialogHeader>

      {/* Always present, so an error is announced when its text arrives. */}
      <p
        role="alert"
        className={
          failure ? "text-sm font-semibold text-destructive" : "sr-only"
        }
      >
        {failure?.message ?? ""}
      </p>
      <p role="status" className="sr-only">
        {signedOut ? "Redirecting you to sign in." : ""}
        {mutation.isPending ? "Cancelling your booking." : ""}
      </p>

      <AlertDialogFooter>
        {stale ? (
          <AlertDialogCancel size="lg" className="w-full sm:w-auto">
            Close
          </AlertDialogCancel>
        ) : (
          <>
            <AlertDialogCancel
              size="lg"
              disabled={busy}
              className="w-full sm:w-auto"
            >
              Keep booking
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="lg"
              className="w-full disabled:cursor-wait disabled:opacity-100 sm:w-auto"
              onClick={confirm}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="motion-safe:animate-spin"
                />
              ) : null}
              {signedOut
                ? "Redirecting you to sign in..."
                : mutation.isPending
                  ? "Cancelling..."
                  : "Cancel booking"}
            </AlertDialogAction>
          </>
        )}
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/**
 * Asks before cancelling and explains the refund rule. Confirm is disabled
 * while the request is sent, so a double click cannot cancel twice. The result
 * (with the API's refund_due) goes to `onCancelled`; the parent closes it.
 */
export function CancelDialog({ booking, onClose, ...rest }: CancelDialogProps) {
  const busyRef = useRef(false);
  return (
    <AlertDialog
      open={booking !== null}
      onOpenChange={(open) => {
        // Escape, a click outside and "Keep booking" all end up here; none of
        // them may close the dialog while the cancel request is on its way.
        if (!open && !busyRef.current) onClose();
      }}
    >
      {booking ? (
        <CancelDialogBody
          key={booking.id}
          booking={booking}
          busyRef={busyRef}
          {...rest}
        />
      ) : null}
    </AlertDialog>
  );
}
