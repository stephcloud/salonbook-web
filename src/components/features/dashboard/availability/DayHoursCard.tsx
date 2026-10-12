"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { TimeSelect } from "@/components/features/dashboard/availability/TimeSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { DayDraft } from "@/lib/availability/draft";

const BREAK_START = 12 * 60;
const BREAK_LENGTH = 60;

type DayHoursCardProps = {
  /** "Monday". */
  name: string;
  /** Unique per day, for element ids. */
  idPrefix: string;
  day: DayDraft;
  /** The message about the start and end, from checking or from the server. */
  hoursError: string | null;
  /** One message (or null) per break. */
  breakErrors: (string | null)[];
  disabled: boolean;
  onChange: (next: DayDraft) => void;
  onCopy: () => void;
};

/** A new break at lunchtime when that fits, otherwise an hour from opening time. */
function newBreak(day: DayDraft) {
  const fits =
    BREAK_START >= day.start && BREAK_START + BREAK_LENGTH <= day.end;
  const start = fits ? BREAK_START : day.start;
  return {
    start,
    end: Math.min(start + BREAK_LENGTH, Math.max(day.end, start + 15)),
  };
}

/** One weekday: open or closed, start and end, and any breaks. */
export function DayHoursCard({
  name,
  idPrefix,
  day,
  hoursError,
  breakErrors,
  disabled,
  onChange,
  onCopy,
}: DayHoursCardProps) {
  const openId = `${idPrefix}-open`;
  const hoursErrorId = `${idPrefix}-hours-error`;

  return (
    <li
      aria-label={name}
      className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold">{name}</h3>
          <Badge variant={day.open ? "confirmed" : "cancelled"}>
            {day.open ? "Open" : "Closed"}
          </Badge>
        </div>
        <label
          htmlFor={openId}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring"
        >
          <Checkbox
            id={openId}
            checked={day.open}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ ...day, open: checked })}
          />
          Open on {name}
        </label>
      </div>

      {day.open ? (
        <>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <TimeSelect
              id={`${idPrefix}-start`}
              label={`${name} opens`}
              value={day.start}
              disabled={disabled}
              invalid={hoursError !== null}
              describedBy={hoursError ? hoursErrorId : undefined}
              onChange={(start) => onChange({ ...day, start })}
            />
            <TimeSelect
              id={`${idPrefix}-end`}
              label={`${name} closes`}
              value={day.end}
              disabled={disabled}
              invalid={hoursError !== null}
              describedBy={hoursError ? hoursErrorId : undefined}
              onChange={(end) => onChange({ ...day, end })}
            />
          </div>
          {hoursError ? (
            <p
              id={hoursErrorId}
              role="alert"
              className="text-sm font-medium text-destructive"
            >
              {hoursError}
            </p>
          ) : null}

          {day.breaks.length > 0 ? (
            <ul className="flex flex-col gap-3" aria-label={`${name} breaks`}>
              {day.breaks.map((range, index) => {
                const error = breakErrors[index] ?? null;
                const errorId = `${idPrefix}-break-${index}-error`;
                const number = index + 1;
                return (
                  <li
                    key={index}
                    className="flex flex-col gap-2 rounded-xl bg-secondary/60 p-3"
                  >
                    <div className="grid grid-cols-1 items-end gap-3 min-[420px]:grid-cols-[1fr_1fr_auto]">
                      <TimeSelect
                        id={`${idPrefix}-break-${index}-start`}
                        label={`Break ${number} starts`}
                        value={range.start}
                        disabled={disabled}
                        invalid={error !== null}
                        describedBy={error ? errorId : undefined}
                        onChange={(start) =>
                          onChange({
                            ...day,
                            breaks: day.breaks.map((b, i) =>
                              i === index ? { ...b, start } : b,
                            ),
                          })
                        }
                      />
                      <TimeSelect
                        id={`${idPrefix}-break-${index}-end`}
                        label={`Break ${number} ends`}
                        value={range.end}
                        disabled={disabled}
                        invalid={error !== null}
                        describedBy={error ? errorId : undefined}
                        onChange={(end) =>
                          onChange({
                            ...day,
                            breaks: day.breaks.map((b, i) =>
                              i === index ? { ...b, end } : b,
                            ),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={disabled}
                        aria-label={`Remove break ${number} on ${name}`}
                        onClick={() =>
                          onChange({
                            ...day,
                            breaks: day.breaks.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                    {error ? (
                      <p
                        id={errorId}
                        role="alert"
                        className="text-sm font-medium text-destructive"
                      >
                        {error}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() =>
                onChange({ ...day, breaks: [...day.breaks, newBreak(day)] })
              }
            >
              <Plus aria-hidden="true" />
              Add a break
              <span className="sr-only"> on {name}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={onCopy}
            >
              <Copy aria-hidden="true" />
              Copy this day&apos;s hours to other days
              <span className="sr-only"> from {name}</span>
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Closed. Customers cannot book {name}.
        </p>
      )}
    </li>
  );
}
