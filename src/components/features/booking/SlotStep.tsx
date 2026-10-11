"use client";

import { StepHeading } from "@/components/features/booking/StepHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSlowPending } from "@/hooks/useSlowPending";
import { useSlots } from "@/hooks/useSlots";
import { ApiError } from "@/lib/api";
import { formatLagosDay, formatLagosTime, lagosToday } from "@/lib/time";

type SlotStepProps = {
  stylistId: string;
  serviceId: string;
  date: string;
  slot: string | null;
  /** Shown above the date, for example after a 409 sent the client back here. */
  notice: string | null;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: string) => void;
  onContinue: () => void;
  onBack: () => void;
};

const LOAD_ERROR_MESSAGE = "Could not load the free times. Please try again.";

/** What to say when loading the times fails. A 401 means apiFetch is already redirecting to /login. */
function loadErrorDetails(error: unknown): { message: string; retry: boolean } {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return { message: "Redirecting you to sign in...", retry: false };
    }
    // Server errors can carry raw text; show our own wording instead.
    if (error.status >= 500) {
      return { message: LOAD_ERROR_MESSAGE, retry: true };
    }
    return { message: error.message || LOAD_ERROR_MESSAGE, retry: true };
  }
  return {
    message: "Could not load the free times. Check your connection.",
    retry: true,
  };
}

export function SlotStep({
  stylistId,
  serviceId,
  date,
  slot,
  notice,
  onDateChange,
  onSlotChange,
  onContinue,
  onBack,
}: SlotStepProps) {
  const today = lagosToday();
  const dateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today;

  const query = useSlots(stylistId, serviceId, date, dateIsValid);
  const waking = useSlowPending(query.isFetching);

  const slots = query.data?.slots ?? [];
  // A slot only counts as chosen while the list on screen still contains it
  // (the list can refresh after Back or a retry).
  const selected = slot !== null && slots.includes(slot) ? slot : null;
  const loading = dateIsValid && !query.isError && query.data === undefined;
  const showDateError = date !== "" && !dateIsValid;
  const loadError = loadErrorDetails(query.error);

  // One small, always-present live region: it announces the outcome without
  // reading out the whole list of times.
  const announcement = !dateIsValid
    ? ""
    : loading
      ? "Loading free times."
      : query.isError
        ? ""
        : slots.length === 0
          ? "No free times on this day."
          : `${slots.length} free times found.`;

  return (
    <div className="flex flex-col gap-4">
      <StepHeading id="step-slot-heading">Pick a date and time</StepHeading>

      {notice ? (
        <p
          role="alert"
          className="rounded-2xl bg-secondary p-4 text-sm font-medium"
        >
          {notice}
        </p>
      ) : null}

      <div className="flex max-w-xs flex-col gap-1.5">
        <Label htmlFor="booking-date">Date</Label>
        <Input
          id="booking-date"
          type="date"
          min={today}
          value={date}
          aria-invalid={showDateError || undefined}
          aria-describedby={showDateError ? "booking-date-error" : undefined}
          onChange={(event) => onDateChange(event.target.value)}
        />
        {showDateError ? (
          <p
            id="booking-date-error"
            role="alert"
            className="text-sm text-destructive"
          >
            Pick today or a later day.
          </p>
        ) : null}
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-col gap-3">
        {!dateIsValid ? (
          <p className="text-muted-foreground">
            Pick a date to see the free times.
          </p>
        ) : query.isError ? (
          loadError.retry ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p>{loadError.message}</p>
              <Button variant="outline" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <p>{loadError.message}</p>
          )
        ) : loading ? (
          <div>
            <p>Loading free times...</p>
            {waking ? (
              <p className="text-sm text-muted-foreground">
                Waking up the server... this can take up to a minute.
              </p>
            ) : null}
          </div>
        ) : slots.length === 0 ? (
          <p>No free times on this day. Try another date.</p>
        ) : (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">
              Free times on {formatLagosDay(date)}
            </legend>
            <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:grid-cols-4">
              {slots.map((value) => (
                <Button
                  key={value}
                  variant={value === selected ? "default" : "outline"}
                  aria-pressed={value === selected}
                  className="px-2"
                  onClick={() => onSlotChange(value)}
                >
                  {formatLagosTime(value)}
                </Button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {slots.length > 0 && selected === null ? (
        <p id="slot-continue-hint" className="text-sm text-muted-foreground">
          Choose a time to continue.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button
          size="lg"
          disabled={selected === null}
          aria-describedby={
            slots.length > 0 && selected === null
              ? "slot-continue-hint"
              : undefined
          }
          onClick={onContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
