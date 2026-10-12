// What the owner edits on screen. Times are minutes since midnight (Lagos
// wall-clock); only src/lib/time.ts turns them into text or into API times.

export type TimeRange = { start: number; end: number };

export type DayDraft = {
  open: boolean;
  start: number;
  end: number;
  breaks: TimeRange[];
};

export type Draft = {
  /** Monday first: index 0 is Monday, which is also the API's weekday 0. */
  days: DayDraft[];
  /** "YYYY-MM-DD", every day off the stylist has, past ones included. */
  daysOff: string[];
};

export const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DEFAULT_START = 9 * 60;
export const DEFAULT_END = 17 * 60;
/** The API takes at most this many rules (hours, breaks and days off together). */
export const MAX_RULES = 200;

export function closedDay(): DayDraft {
  return { open: false, start: DEFAULT_START, end: DEFAULT_END, breaks: [] };
}

export function emptyDraft(): Draft {
  return { days: WEEKDAY_NAMES.map(closedDay), daysOff: [] };
}

export function cloneDay(day: DayDraft): DayDraft {
  return { ...day, breaks: day.breaks.map((b) => ({ ...b })) };
}

export function cloneDraft(draft: Draft): Draft {
  return { days: draft.days.map(cloneDay), daysOff: [...draft.daysOff] };
}

export function draftsEqual(a: Draft, b: Draft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Gives every day in `targets` the same hours and breaks as day `from`. */
export function copyDayHours(
  draft: Draft,
  from: number,
  targets: number[],
): Draft {
  const source = draft.days[from];
  if (!source) return draft;
  const next = cloneDraft(draft);
  for (const target of targets) {
    if (target !== from && next.days[target]) {
      next.days[target] = cloneDay(source);
    }
  }
  return next;
}

/** `to` gets the hours of `from`; days off are copied only when asked. */
export function copyDraft(from: Draft, to: Draft, withDaysOff: boolean): Draft {
  const copy = cloneDraft(from);
  return withDaysOff ? copy : { ...copy, daysOff: [...to.daysOff] };
}
