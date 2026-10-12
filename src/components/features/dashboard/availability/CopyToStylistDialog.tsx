"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSlowPending } from "@/hooks/useSlowPending";
import { availabilityKey } from "@/hooks/useStylistAvailability";
import type { Stylist } from "@/lib/api";
import { copyHoursToStylist } from "@/lib/availability/copy";
import type { DayDraft } from "@/lib/availability/draft";
import {
  describeAvailabilitySaveError,
  firstMessage,
} from "@/lib/availability/save-error";

type CopyToStylistDialogProps = {
  open: boolean;
  sourceName: string;
  /** The other stylists in this salon. */
  others: Stylist[];
  /** The hours as shown now (already checked), unsaved changes included. */
  days: DayDraft[];
  /** The source stylist's saved days off. */
  daysOff: string[];
  onClose: () => void;
  onCopied: (message: string) => void;
};

type FormProps = Omit<CopyToStylistDialogProps, "open"> & {
  busyRef: { current: boolean };
};

function CopyToStylistForm({
  sourceName,
  others,
  days,
  daysOff,
  onClose,
  onCopied,
  busyRef,
}: FormProps) {
  const queryClient = useQueryClient();
  const [targetId, setTargetId] = useState(others[0]?.id ?? "");
  const [withDaysOff, setWithDaysOff] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waking = useSlowPending(pending);
  const target = others.find((stylist) => stylist.id === targetId);

  async function submit() {
    if (busyRef.current || !target || !confirmed) return;
    busyRef.current = true;
    setError(null);
    setPending(true);
    try {
      const saved = await copyHoursToStylist({
        targetId: target.id,
        days,
        daysOff: withDaysOff ? daysOff : undefined,
      });
      await queryClient.cancelQueries({ queryKey: availabilityKey(target.id) });
      queryClient.setQueryData(availabilityKey(target.id), saved);
    } catch (caught) {
      const failure = describeAvailabilitySaveError(caught, []);
      setError(firstMessage(failure));
      if (failure.signedOut) setLocked(true);
      busyRef.current = failure.signedOut;
      setPending(false);
      return;
    }
    busyRef.current = false;
    setPending(false);
    onCopied(`Hours copied to ${target.name}.`);
  }

  const disabled = pending || locked;

  return (
    <form
      className="flex flex-col gap-4"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {error ? (
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="copy-target" className="text-sm font-medium">
          Copy to
        </label>
        <select
          id="copy-target"
          value={targetId}
          disabled={disabled}
          onChange={(event) => {
            setTargetId(event.target.value);
            setConfirmed(false);
          }}
          className="min-h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
        >
          {others.map((stylist) => (
            <option key={stylist.id} value={stylist.id}>
              {stylist.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring">
        <Checkbox
          checked={withDaysOff}
          disabled={disabled}
          onCheckedChange={setWithDaysOff}
        />
        Also copy {sourceName}&apos;s days off
      </label>
      <p className="text-sm text-muted-foreground">
        This copies the hours as you see them now, including changes you have
        not saved yet. It replaces all of {target?.name ?? "their"} weekly hours
        and breaks
        {withDaysOff ? " and days off" : ", but keeps their days off"}.
      </p>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring">
        <Checkbox
          checked={confirmed}
          disabled={disabled}
          onCheckedChange={setConfirmed}
        />
        Yes, replace {target?.name ?? "their"}&apos;s hours
      </label>
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={disabled || !confirmed || !target}
          focusableWhenDisabled
        >
          {pending ? "Copying…" : "Copy hours"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={disabled}
          focusableWhenDisabled
          onClick={onClose}
        >
          Cancel
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

/** Copy this stylist's weekly hours to another stylist in the salon. */
export function CopyToStylistDialog({
  open,
  ...rest
}: CopyToStylistDialogProps) {
  const busyRef = useRef(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busyRef.current) rest.onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy hours to another stylist</DialogTitle>
          <DialogDescription>
            Give another stylist the same weekly hours as {rest.sourceName}.
          </DialogDescription>
        </DialogHeader>
        {open ? <CopyToStylistForm {...rest} busyRef={busyRef} /> : null}
      </DialogContent>
    </Dialog>
  );
}
