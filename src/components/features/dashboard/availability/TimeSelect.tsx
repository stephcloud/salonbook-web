"use client";

import { clockOptionMinutes, formatClockMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";

const OPTIONS = clockOptionMinutes(15);

type TimeSelectProps = {
  id: string;
  /** The visible label. */
  label: string;
  /** Minutes since midnight. */
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * A labelled time picker: a native select with a choice every 15 minutes,
 * shown in 12-hour form ("9:00 AM"). A time stored on the server that is not on
 * the 15-minute grid (9:10 AM) is added to the list so it is never lost.
 */
export function TimeSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: TimeSelectProps) {
  const options = OPTIONS.includes(value)
    ? OPTIONS
    : [...OPTIONS, value].sort((a, b) => a - b);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "min-h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3 py-2 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive ring-3 ring-destructive/20",
        )}
      >
        {options.map((minutes) => (
          <option key={minutes} value={minutes}>
            {formatClockMinutes(minutes)}
          </option>
        ))}
      </select>
    </div>
  );
}
