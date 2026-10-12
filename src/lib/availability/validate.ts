import { formatClockMinutes } from "@/lib/time";
import { MAX_RULES, type DayDraft, type Draft } from "./draft";

export type DayErrors = {
  /** About the day's start and end. */
  hours: string | null;
  /** One entry per break, in the order shown. */
  breaks: (string | null)[];
};

export type DraftValidation = {
  days: DayErrors[];
  /** Not about one row, such as too many rules. */
  general: string | null;
  ok: boolean;
};

/** Checks one day. A closed day has nothing to check (its breaks are not sent). */
export function validateDay(day: DayDraft): DayErrors {
  const none: DayErrors = { hours: null, breaks: day.breaks.map(() => null) };
  if (!day.open) return none;

  const hours =
    day.end <= day.start ? "The end time must be after the start time." : null;
  const breaks: (string | null)[] = day.breaks.map((range) => {
    if (range.end <= range.start) {
      return "The break must end after it starts.";
    }
    if (hours === null && (range.start < day.start || range.end > day.end)) {
      return `The break must be inside the working hours (${formatClockMinutes(day.start)} to ${formatClockMinutes(day.end)}).`;
    }
    return null;
  });

  // Breaks that only touch (12:00 to 1:00, then 1:00 to 2:00) are fine.
  const order = day.breaks
    .map((range, index) => ({ range, index }))
    .sort((a, b) => a.range.start - b.range.start);
  for (let i = 1; i < order.length; i++) {
    const previous = order[i - 1];
    const current = order[i];
    if (!previous || !current) continue;
    if (current.range.start < previous.range.end && !breaks[current.index]) {
      breaks[current.index] = "This break overlaps another break.";
    }
  }

  return { hours, breaks };
}

export function validateDraft(draft: Draft): DraftValidation {
  const days = draft.days.map(validateDay);
  const rules =
    draft.days.reduce(
      (sum, day) => sum + (day.open ? 1 + day.breaks.length : 0),
      0,
    ) + draft.daysOff.length;
  const general =
    rules > MAX_RULES
      ? `That is too many entries (${rules}). The most allowed is ${MAX_RULES}. Remove some breaks or days off.`
      : null;
  const ok =
    general === null &&
    days.every(
      (day) => day.hours === null && day.breaks.every((b) => b === null),
    );
  return { days, general, ok };
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Checks a day off the owner wants to add. `today` is the Lagos calendar day
 * ("YYYY-MM-DD", from `lagosToday`). The API itself accepts past dates, so
 * this is the only place that stops them.
 */
export function validateDayOff(
  date: string,
  existing: string[],
  today: string,
): string | null {
  if (!date) return "Choose a date.";
  if (!isRealDate(date)) return "That is not a real date.";
  if (date < today) {
    return "Choose today or a later day. Past days cannot be added.";
  }
  if (existing.includes(date))
    return "That day is already marked as a day off.";
  return null;
}
