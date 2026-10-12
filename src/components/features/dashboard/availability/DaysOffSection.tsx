"use client";

import { useState } from "react";
import { CalendarOff, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateDayOff } from "@/lib/availability/validate";
import { formatLagosDay, lagosToday } from "@/lib/time";

type DaysOffSectionProps = {
  /** Every saved day off, "YYYY-MM-DD". Only the upcoming ones are listed. */
  daysOff: string[];
  disabled: boolean;
  /** A message from the server about the days off, or null. */
  serverError: string | null;
  /** Saves the new list; resolves true when the server accepted it. */
  onAdd: (date: string) => Promise<boolean>;
  onRemove: (date: string) => void;
};

/** The upcoming days a stylist is off, with add and remove. Each change is saved at once. */
export function DaysOffSection({
  daysOff,
  disabled,
  serverError,
  onAdd,
  onRemove,
}: DaysOffSectionProps) {
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const today = lagosToday();
  const upcoming = daysOff.filter((value) => value >= today).sort();
  const shownError = error ?? serverError;

  async function add() {
    const problem = validateDayOff(date, daysOff, today);
    setError(problem);
    if (problem) return;
    if (await onAdd(date)) setDate("");
  }

  return (
    <section
      aria-labelledby="days-off-heading"
      className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border"
    >
      <div className="flex flex-col gap-1">
        <h2 id="days-off-heading" className="text-xl font-bold">
          Days off
        </h2>
        <p className="text-sm text-muted-foreground">
          Days this stylist cannot be booked, such as holidays. Adding or
          removing one saves straight away. Bookings already made for that day
          are not cancelled.
        </p>
      </div>

      {upcoming.length === 0 ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <CalendarOff aria-hidden="true" className="size-4 shrink-0" />
          No upcoming days off.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Upcoming days off">
          {upcoming.map((value) => {
            const label = formatLagosDay(value);
            return (
              <li
                key={value}
                className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-3 py-1"
              >
                <span className="font-medium">{label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  aria-label={`Remove day off ${label}`}
                  onClick={() => onRemove(value)}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        noValidate
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="day-off-date" className="text-sm font-medium">
            Date
          </label>
          <Input
            id="day-off-date"
            type="date"
            min={today}
            value={date}
            disabled={disabled}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? "day-off-error" : undefined}
            onChange={(event) => {
              setDate(event.target.value);
              setError(null);
            }}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          variant="outline"
          disabled={disabled}
          focusableWhenDisabled
        >
          <Plus aria-hidden="true" />
          Add a day off
        </Button>
      </form>
      {shownError ? (
        <p
          id="day-off-error"
          role="alert"
          className="text-sm font-medium text-destructive"
        >
          {shownError}
        </p>
      ) : null}
    </section>
  );
}
