import { ApiError } from "@/lib/api";
import type { RuleRef } from "./convert";

export const breakKey = (day: number, index: number) => `${day}:${index}`;

export type AvailabilitySaveFailure = {
  /** Messages for a day's start and end, by day index (0 is Monday). */
  days: Record<number, string>;
  /** Messages for a break, by `breakKey(day, index)`. */
  breaks: Record<string, string>;
  /** About the days off list. */
  daysOff: string | null;
  /** A message for the whole page, or null when the row messages say it all. */
  message: string | null;
  /** The session is over; the browser is already going to /login. */
  signedOut: boolean;
};

const GENERIC = "Something went wrong on our side. Please try again.";
const OFFLINE =
  "Could not reach the server. Check your connection and try again.";

function failure(message: string, signedOut = false): AvailabilitySaveFailure {
  return { days: {}, breaks: {}, daysOff: null, message, signedOut };
}

function sentence(message: string): string {
  const text = message.replace(/^Value error,\s*/, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The API's wording is for developers; say the common ones in plain words. */
function friendly(message: string): string {
  const text = sentence(message);
  if (/end_time must be after start_time/i.test(text)) {
    return "The end time must be after the start time.";
  }
  return text;
}

type DetailItem = { loc: unknown[]; msg: string };

function items(detail: unknown): DetailItem[] {
  if (!Array.isArray(detail)) return [];
  return detail.flatMap((item): DetailItem[] => {
    if (!item || typeof item !== "object") return [];
    const { loc, msg } = item as { loc?: unknown; msg?: unknown };
    return Array.isArray(loc) && typeof msg === "string" ? [{ loc, msg }] : [];
  });
}

/** The API words some rules as one plain sentence with no position in it. */
function fromPlainSentence(text: string): AvailabilitySaveFailure {
  const result = failure(GENERIC);
  result.message = null;
  const weekday = /weekday (\d)/.exec(text);
  const day = weekday ? Number(weekday[1]) : -1;
  if (/duplicate day_off/i.test(text)) {
    result.daysOff = "That day is already marked as a day off.";
  } else if (/overlapping break/i.test(text) && day >= 0) {
    result.days[day] = "Two breaks overlap. Change one of them.";
  } else if (/overlapping working/i.test(text) && day >= 0) {
    result.days[day] = "These hours overlap other hours on the same day.";
  } else {
    result.message = sentence(text);
  }
  return result;
}

/**
 * Turns whatever a failed save threw into messages placed on the right rows.
 * `refs` is the list `draftToRules` made for the request that failed: the
 * API's 422 says which rule (by position) was wrong, and `refs` says which
 * day, break or day off that was.
 */
export function describeAvailabilitySaveError(
  error: unknown,
  refs: RuleRef[],
): AvailabilitySaveFailure {
  if (!(error instanceof ApiError)) return failure(OFFLINE);

  switch (error.status) {
    case 401:
      return failure("Please sign in again.", true);
    case 403:
      return failure(
        "You can only change hours for stylists in your own salon.",
      );
    case 404:
      return failure(
        "We could not find this stylist. They may have been removed. Reload the page.",
      );
    case 409:
      return failure(error.message);
    case 422:
      break;
    case 500:
      return failure(GENERIC);
    default:
      return failure(error.message);
  }

  if (typeof error.detail === "string") return fromPlainSentence(error.detail);

  const result = failure(GENERIC);
  result.message = null;
  let placed = false;
  for (const { loc, msg } of items(error.detail)) {
    const at = loc.indexOf("rules");
    const position = at >= 0 ? loc[at + 1] : undefined;
    const ref = typeof position === "number" ? refs[position] : undefined;
    const text = friendly(msg);
    if (!ref) {
      result.message ??= text;
      continue;
    }
    placed = true;
    if (ref.kind === "hours") result.days[ref.day] ??= text;
    else if (ref.kind === "break") {
      result.breaks[breakKey(ref.day, ref.index)] ??= text;
    } else result.daysOff ??= text;
  }

  if (!placed && result.message === null) {
    result.message = "Check the hours and try again.";
  }
  return result;
}
