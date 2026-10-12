"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WEEKDAY_NAMES } from "@/lib/availability/draft";

type CopyDayDialogProps = {
  /** Index of the day to copy from (0 is Monday); null keeps the dialog closed. */
  source: number | null;
  onClose: () => void;
  onCopy: (source: number, targets: number[]) => void;
};

function CopyDayForm({
  source,
  onClose,
  onCopy,
}: Omit<CopyDayDialogProps, "source"> & { source: number }) {
  const [targets, setTargets] = useState<number[]>([]);
  const name = WEEKDAY_NAMES[source];

  function toggle(day: number, checked: boolean) {
    setTargets((current) =>
      checked
        ? current.includes(day)
          ? current
          : [...current, day]
        : current.filter((value) => value !== day),
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (targets.length === 0) return;
        onCopy(source, targets);
      }}
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">Copy to these days</legend>
        {WEEKDAY_NAMES.map((dayName, day) =>
          day === source ? null : (
            <label
              key={dayName}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring"
            >
              <Checkbox
                checked={targets.includes(day)}
                onCheckedChange={(checked) => toggle(day, checked)}
              />
              {dayName}
            </label>
          ),
        )}
      </fieldset>
      <p className="text-sm text-muted-foreground">
        The hours and breaks of {name} replace those days&apos; hours. Nothing
        is saved until you press Save hours.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={targets.length === 0}
          focusableWhenDisabled
        >
          Copy hours
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Choose which other days get the hours and breaks of one day. */
export function CopyDayDialog({ source, onClose, onCopy }: CopyDayDialogProps) {
  return (
    <Dialog
      open={source !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {source === null
              ? "Copy hours"
              : `Copy ${WEEKDAY_NAMES[source]}'s hours`}
          </DialogTitle>
          <DialogDescription>
            Give other days the same opening hours and breaks.
          </DialogDescription>
        </DialogHeader>
        {source === null ? null : (
          <CopyDayForm
            key={source}
            source={source}
            onClose={onClose}
            onCopy={onCopy}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
