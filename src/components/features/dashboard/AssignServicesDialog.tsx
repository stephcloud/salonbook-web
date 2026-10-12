"use client";

import { useRef, useState, type FormEvent } from "react";
import { NoServicesNotice } from "@/components/features/dashboard/NoServicesNotice";
import { ServiceCheckboxList } from "@/components/features/dashboard/ServiceCheckboxList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSlowPending } from "@/hooks/useSlowPending";
import { setStylistServices, type Service, type Stylist } from "@/lib/api";
import { describeAssignError } from "@/lib/stylist/save-error";

type AssignServicesDialogProps = {
  /** The stylist to change; null keeps the dialog closed. */
  stylist: Stylist | null;
  services: Service[];
  onClose: () => void;
  /** The API saved the new set (the section refreshes and closes). */
  onSaved: (message: string) => void;
};

type BodyProps = Omit<AssignServicesDialogProps, "stylist" | "onClose"> & {
  stylist: Stylist;
  onClose: () => void;
  busyRef: { current: boolean };
};

function AssignServicesForm({
  stylist,
  services,
  onClose,
  onSaved,
  busyRef,
}: BodyProps) {
  // Only services that still exist can be ticked.
  const [selected, setSelected] = useState<string[]>(
    stylist.service_ids.filter((id) => services.some((s) => s.id === id)),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const waking = useSlowPending(pending);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setFormError(null);
    setPending(true);
    try {
      await setStylistServices(stylist.id, selected);
    } catch (error) {
      const failure = describeAssignError(error);
      setFormError(failure.message);
      if (failure.signedOut) setLocked(true);
      busyRef.current = failure.signedOut;
      setPending(false);
      return;
    }
    busyRef.current = false;
    setPending(false);
    onSaved(`Services saved for ${stylist.name}.`);
  }

  const disabled = pending || locked;

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={pending}
      className="flex flex-col gap-4"
    >
      {formError ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {formError}
        </p>
      ) : null}
      {services.length === 0 ? (
        <NoServicesNotice />
      ) : (
        <>
          <ServiceCheckboxList
            idPrefix={`assign-${stylist.id}`}
            legend="Services this stylist offers"
            services={services}
            selected={selected}
            onChange={setSelected}
            disabled={disabled}
          />
          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              With no service ticked, clients cannot book this stylist.
            </p>
          ) : null}
        </>
      )}
      <div className="flex flex-wrap gap-3">
        {services.length === 0 ? null : (
          <Button type="submit" size="lg" disabled={disabled}>
            {pending ? "Saving…" : "Save services"}
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={disabled}
          onClick={onClose}
        >
          {services.length === 0 ? "Close" : "Cancel"}
        </Button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-muted-foreground"
      >
        {waking
          ? "Waking up the server. This can take up to a minute, please wait."
          : ""}
      </p>
    </form>
  );
}

/** Choose which services an existing stylist offers. */
export function AssignServicesDialog({
  stylist,
  onClose,
  ...rest
}: AssignServicesDialogProps) {
  const busyRef = useRef(false);
  return (
    <Dialog
      open={stylist !== null}
      onOpenChange={(next) => {
        if (!next && !busyRef.current) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {stylist ? `Services for ${stylist.name}` : "Services"}
          </DialogTitle>
          <DialogDescription>
            Clients can book this stylist only for the services ticked here.
          </DialogDescription>
        </DialogHeader>
        {stylist ? (
          <AssignServicesForm
            key={stylist.id}
            stylist={stylist}
            onClose={onClose}
            busyRef={busyRef}
            {...rest}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
