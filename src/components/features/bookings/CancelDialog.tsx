"use client";

import { useRef, useState, type RefObject } from "react";
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
import { cancelBooking, type Booking, type BookingListItem } from "@/lib/api";
import { classifyCancelError, type CancelFailure } from "@/lib/cancel-errors";
import { cancelOutcome, type CancelOutcome } from "@/lib/cancel-outcome";
import { refundRuleText } from "@/lib/refund";
import { formatLagosDateTime } from "@/lib/time";

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

function CancelDialogBody({
  booking,
  busyRef,
  onCancelled,
  onStale,
}: BodyProps) {
  // One request at a time. The ref closes the gap before React re-renders, so
  // two quick clicks cannot cancel twice.
  const sending = useRef(false);
  const [failure, setFailure] = useState<CancelFailure | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  const mutation = useMutation({
    mutationFn: () => cancelBooking(booking.id),
    onSuccess: (cancelled) => {
      busyRef.current = false;
      const outcome = cancelOutcome({
        wasPaid: booking.status === "confirmed",
        refundDue: cancelled.refund_due,
        cancellationHours: booking.salon.cancellation_hours,
      });
      onCancelled({ previous: booking, cancelled, outcome });
    },
    onError: (error) => {
      const result = classifyCancelError(error);
      if (result.kind === "signed-out") {
        // apiFetch is already sending the client to /login.
        setSignedOut(true);
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

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
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

      {failure ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {failure.kind === "signed-out" ? "" : failure.message}
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {signedOut ? "Redirecting you to sign in." : ""}
        {mutation.isPending ? "Cancelling your booking." : ""}
      </p>

      <AlertDialogFooter>
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
