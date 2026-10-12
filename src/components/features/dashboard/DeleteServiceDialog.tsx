"use client";

import { useRef, useState } from "react";
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
import { useSlowPending } from "@/hooks/useSlowPending";
import { deleteService, type Service } from "@/lib/api";
import {
  HAS_BOOKINGS_MESSAGE,
  describeServiceDeleteError,
} from "@/lib/service/save-error";

type DeleteServiceDialogProps = {
  /** The service to delete; null keeps the dialog closed. */
  service: Service | null;
  onClose: () => void;
  /** The API deleted it (the section refreshes and closes). */
  onDeleted: (message: string) => void;
};

type BodyProps = Omit<DeleteServiceDialogProps, "service" | "onClose"> & {
  service: Service;
  busyRef: { current: boolean };
};

function DeleteServiceBody({ service, onDeleted, busyRef }: BodyProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const waking = useSlowPending(pending);

  async function confirm() {
    if (busyRef.current) return;
    busyRef.current = true;
    setFailed(null);
    setPending(true);
    try {
      await deleteService(service.id);
    } catch (error) {
      // 409 means it has bookings: say so and keep the service.
      const failure = describeServiceDeleteError(error);
      setFailed(failure.message);
      if (failure.signedOut) setLocked(true);
      busyRef.current = failure.signedOut;
      setPending(false);
      return;
    }
    busyRef.current = false;
    setPending(false);
    onDeleted(`${service.name} was deleted.`);
  }

  const disabled = pending || locked;

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {service.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          Customers will no longer be able to book it. This cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {failed ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {failed}
        </p>
      ) : null}
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground empty:hidden"
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
          {failed ? "Close" : "Keep service"}
        </AlertDialogCancel>
        {failed === HAS_BOOKINGS_MESSAGE || locked ? null : (
          <AlertDialogAction
            size="lg"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={disabled}
            onClick={confirm}
          >
            {pending ? "Deleting…" : failed ? "Try again" : "Delete service"}
          </AlertDialogAction>
        )}
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/**
 * Confirms before deleting a service. Delete is disabled while the request is
 * sent, and the dialog cannot be dismissed then. If the API refuses because
 * the service has bookings, the message says so and the service stays.
 */
export function DeleteServiceDialog({
  service,
  onClose,
  ...rest
}: DeleteServiceDialogProps) {
  const busyRef = useRef(false);
  return (
    <AlertDialog
      open={service !== null}
      onOpenChange={(open) => {
        if (!open && !busyRef.current) onClose();
      }}
    >
      {service ? (
        <DeleteServiceBody
          key={service.id}
          service={service}
          busyRef={busyRef}
          {...rest}
        />
      ) : null}
    </AlertDialog>
  );
}
