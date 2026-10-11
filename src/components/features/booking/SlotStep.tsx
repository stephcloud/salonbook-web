"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSlowPending } from "@/hooks/useSlowPending";
import { ApiError, getSlots } from "@/lib/api";
import { formatLagosDate, formatLagosTime, lagosToday } from "@/lib/time";

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

export function slotsQueryKey(
  stylistId: string,
  serviceId: string,
  date: string,
) {
  return ["slots", stylistId, serviceId, date] as const;
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

  const query = useQuery({
    queryKey: slotsQueryKey(stylistId, serviceId, date),
    queryFn: () => getSlots(stylistId, serviceId, date),
    enabled: dateIsValid,
  });
  const waking = useSlowPending(query.isFetching);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Pick a date and time</h2>

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
          onChange={(event) => onDateChange(event.target.value)}
        />
        {date && !dateIsValid ? (
          <p role="alert" className="text-sm text-destructive">
            Pick today or a later day.
          </p>
        ) : null}
      </div>

      <div aria-live="polite" className="flex flex-col gap-3">
        {!dateIsValid ? (
          <p className="text-muted-foreground">
            Pick a date to see the free times.
          </p>
        ) : query.isError ? (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p>
              {query.error instanceof ApiError
                ? query.error.message
                : "Could not load the free times. Check your connection."}
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        ) : query.isPending || (query.isFetching && !query.data) ? (
          <div role="status">
            <p>Loading free times...</p>
            {waking ? (
              <p className="text-sm text-muted-foreground">
                Waking up the server... this can take up to a minute.
              </p>
            ) : null}
          </div>
        ) : query.data.slots.length === 0 ? (
          <p>No free times on this day. Try another date.</p>
        ) : (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">
              Free times on {formatLagosDate(`${date}T12:00:00+01:00`)}
            </legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {query.data.slots.map((value) => (
                <Button
                  key={value}
                  variant={value === slot ? "default" : "outline"}
                  aria-pressed={value === slot}
                  onClick={() => onSlotChange(value)}
                >
                  {formatLagosTime(value)}
                </Button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" disabled={slot === null} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
