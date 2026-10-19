"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { cancelBooking, type OwnerBooking } from "@/lib/api";
import {
  classifyOwnerCancelError,
  ownerCancelOutcome,
  type OwnerCancelFailure,
} from "@/lib/owner-cancel";
import { formatLagosDateTime } from "@/lib/time";

/** How long a sign-in redirect may take before the dialog lets go. */
const SIGN_IN_REDIRECT_MS = 10_000;

export type OwnerCancelResult = {
  booking: OwnerBooking;
  /** From the API's refund_due: "Deposit will be refunded in full" or "Nothing to refund". */
  outcome: string;
};

type OwnerCancelDialogProps = {
  salonId: string;
  /** The booking to cancel; null keeps the dialog closed. */
  booking: OwnerBooking | null;
  onClose: () => void;
  onCancelled: (result: OwnerCancelResult) => void;
};

type BodyProps = Omit<OwnerCancelDialogProps, "booking" | "onClose"> & {
  booking: OwnerBooking;
  /** True while a cancel request is in flight, so the dialog cannot be dismissed. */
  busyRef: RefObject<boolean>;
};

function OwnerCancelDialogBody({
  salonId,
  booking,
  busyRef,
  onCancelled,
}: BodyProps) {
  const queryClient = useQueryClient();
  // The ref closes the gap before React re-renders, so two quick clicks send
  // one request.
  const sending = useRef(false);
  const [failure, setFailure] = useState<Exclude<
    OwnerCancelFailure,
    { kind: "signed-out" }
  > | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(
    () => () => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
    },
    [],
  );

  const refreshList = () =>
    queryClient.invalidateQueries({
      queryKey: ["salon", salonId, "owner-bookings"],
    });

  const mutation = useMutation({
    mutationFn: () => cancelBooking(booking.id),
    onSuccess: (cancelled) => {
      busyRef.current = false;
      void refreshList();
      onCancelled({
        booking,
        outcome: ownerCancelOutcome(cancelled.refund_due),
      });
    },
    onError: (error) => {
      const result = classifyOwnerCancelError(error);
      if (result.kind === "signed-out") {
        // apiFetch is already sending the owner to /login. If that never
        // happens, let go after a while so the dialog is not stuck.
        setSignedOut(true);
        releaseTimer.current = setTimeout(() => {
          sending.current = false;
          busyRef.current = false;
          setSignedOut(false);
          setFailure({
            kind: "retry",
            message: "The sign-in page did not open. Please try again.",
          });
        }, SIGN_IN_REDIRECT_MS);
        return;
      }
      sending.current = false;
      busyRef.current = false;
      setFailure(result);
      if (result.kind === "stale") void refreshList();
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
  // Another try would fail the same way, so the only thing left is to close.
  const final = failure?.kind === "stale" || failure?.kind === "forbidden";

  // The footer swaps to a single Close button, so keyboard focus moves to the
  // message instead of falling to the page.
  useEffect(() => {
    if (final) alertRef.current?.focus();
  }, [final]);

  return (
    <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-sm">
      <AlertDialogHeader className="place-items-start text-left">
        <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
        <AlertDialogDescription render={<div />}>
          <p>
            {booking.client_name}: {booking.service.name} with{" "}
            {booking.stylist.name}, {formatLagosDateTime(booking.starts_at)}.
          </p>
          <p className="mt-2">
            {paid
              ? "The client will be refunded their full deposit and will be emailed that the salon cancelled."
              : "This booking has not been paid, so there is nothing to refund."}
          </p>
        </AlertDialogDescription>
      </AlertDialogHeader>

      {/* Always present, so an error is announced when its text arrives. */}
      <p
        ref={alertRef}
        role="alert"
        tabIndex={-1}
        className={
          failure
            ? "text-sm font-semibold text-destructive outline-none"
            : "sr-only"
        }
      >
        {failure?.message ?? ""}
      </p>
      <p role="status" className="sr-only">
        {signedOut ? "Redirecting you to sign in." : ""}
        {mutation.isPending ? "Cancelling the booking." : ""}
      </p>

      <AlertDialogFooter>
        {final ? (
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
              className="w-full aria-disabled:cursor-wait sm:w-auto"
              onClick={confirm}
              // aria-disabled, not disabled, so keyboard focus stays on the
              // button while the request runs; confirm() ignores extra clicks.
              aria-disabled={busy}
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
                  : failure?.kind === "retry"
                    ? "Try again"
                    : "Cancel booking"}
            </AlertDialogAction>
          </>
        )}
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/**
 * Asks the owner before cancelling a booking and says plainly what the client
 * gets. Confirm is disabled while the request is sent, so a double click
 * cancels once. The parent closes the dialog from `onCancelled`.
 */
export function OwnerCancelDialog({
  booking,
  onClose,
  ...rest
}: OwnerCancelDialogProps) {
  const busyRef = useRef(false);
  return (
    <AlertDialog
      open={booking !== null}
      onOpenChange={(open) => {
        // Escape, a click outside and "Keep booking" all end up here; none of
        // them may close the dialog while the request is on its way.
        if (!open && !busyRef.current) onClose();
      }}
    >
      {booking ? (
        <OwnerCancelDialogBody
          key={booking.id}
          booking={booking}
          busyRef={busyRef}
          {...rest}
        />
      ) : null}
    </AlertDialog>
  );
}
