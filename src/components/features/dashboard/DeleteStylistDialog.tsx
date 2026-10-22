"use client";

import { useEffect, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { useSlowPending } from "@/hooks/useSlowPending";
import { deleteStylist, type Stylist } from "@/lib/api";
import { describeStylistDeleteError } from "@/lib/stylist/save-error";

type DeleteStylistDialogProps = {
  /** The stylist to delete; null keeps the dialog closed. */
  stylist: Stylist | null;
  onClose: () => void;
  /** The API deleted them (the section refreshes and closes). */
  onDeleted: (message: string) => void;
  /** The API answered 404: they were already gone (the section refreshes and closes). */
  onGone: (message: string) => void;
  /** They have bookings: the owner chose to edit them instead. */
  onEditInstead: (stylist: Stylist) => void;
  /** Where focus goes when the dialog closes (see Base UI's `finalFocus`). */
  finalFocus?: () => boolean | HTMLElement | null;
};

type BodyProps = Omit<DeleteStylistDialogProps, "stylist" | "onClose"> & {
  stylist: Stylist;
  busyRef: { current: boolean };
};

function DeleteStylistBody({
  stylist,
  onDeleted,
  onGone,
  onEditInstead,
  busyRef,
  finalFocus,
}: BodyProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [hasBookings, setHasBookings] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [locked, setLocked] = useState(false);
  const waking = useSlowPending(pending);
  const alertRef = useRef<HTMLParagraphElement>(null);

  // A form-level message can sit out of view in a scrolling dialog: bring it into view and read it.
  useEffect(() => {
    if (failed) alertRef.current?.focus();
  }, [failed]);

  async function confirm() {
    if (busyRef.current) return;
    busyRef.current = true;
    setFailed(null);
    setPending(true);
    try {
      await deleteStylist(stylist.id);
    } catch (error) {
      const failure = describeStylistDeleteError(error);
      busyRef.current = failure.signedOut;
      setPending(false);
      if (failure.gone) {
        onGone(failure.message);
        return;
      }
      setFailed(failure.message);
      setHasBookings(failure.hasBookings === true);
      setForbidden(failure.forbidden === true);
      if (failure.signedOut) setLocked(true);
      return;
    }
    busyRef.current = false;
    setPending(false);
    onDeleted(`${stylist.name} was deleted.`);
  }

  const disabled = pending || locked;
  // After a 401 or 403 trying again cannot work; after a 409 editing is offered instead.
  const canDelete = !locked && !forbidden && !hasBookings;

  return (
    <AlertDialogContent finalFocus={finalFocus}>
      <AlertDialogHeader>
        <AlertDialogTitle className="break-words">
          Delete {stylist.name}?
        </AlertDialogTitle>
        {/* After a 409 the alert explains why nothing was deleted; this would contradict it. */}
        {hasBookings ? null : (
          <AlertDialogDescription>
            Customers will no longer be able to book them, and their hours and
            services are removed too. This cannot be undone.
          </AlertDialogDescription>
        )}
      </AlertDialogHeader>
      {failed ? (
        <p
          role="alert"
          ref={alertRef}
          tabIndex={-1}
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive outline-none"
        >
          {failed}
        </p>
      ) : null}
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-muted-foreground"
      >
        {waking
          ? "Waking up the server. This can take up to a minute, please wait."
          : ""}
      </p>
      <AlertDialogFooter>
        <AlertDialogCancel
          size="lg"
          className="w-full sm:w-auto"
          disabled={disabled}
        >
          {failed ? "Close" : "Keep stylist"}
        </AlertDialogCancel>
        {hasBookings ? (
          <Button
            size="lg"
            className="h-auto w-full py-2 text-center break-words whitespace-normal sm:w-auto"
            onClick={() => onEditInstead(stylist)}
          >
            Edit {stylist.name}
          </Button>
        ) : null}
        {canDelete ? (
          <AlertDialogAction
            size="lg"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={disabled}
            focusableWhenDisabled
            onClick={confirm}
          >
            {pending ? "Deleting…" : failed ? "Try again" : "Delete stylist"}
          </AlertDialogAction>
        ) : null}
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/**
 * Confirms before deleting a stylist. Delete is disabled while the request is
 * sent, and the dialog cannot be dismissed then. If the API refuses because
 * the stylist has bookings, the message says so and offers to edit instead.
 */
export function DeleteStylistDialog({
  stylist,
  onClose,
  ...rest
}: DeleteStylistDialogProps) {
  const busyRef = useRef(false);
  return (
    <AlertDialog
      open={stylist !== null}
      onOpenChange={(open) => {
        if (!open && !busyRef.current) onClose();
      }}
    >
      {stylist ? (
        <DeleteStylistBody
          key={stylist.id}
          stylist={stylist}
          busyRef={busyRef}
          {...rest}
        />
      ) : null}
    </AlertDialog>
  );
}
