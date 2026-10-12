const TIME_ZONE = "Africa/Lagos";

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function lagosParts(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid date: ${String(input)}`);
  }

  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

/** "Sat, 7 Mar 2026" in Africa/Lagos. */
export function formatLagosDate(input: string | Date): string {
  const p = lagosParts(input);
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** "9:30 AM" in Africa/Lagos. */
export function formatLagosTime(input: string | Date): string {
  const p = lagosParts(input);
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** "Sat, 7 Mar 2026, 9:30 AM" in Africa/Lagos. */
export function formatLagosDateTime(input: string | Date): string {
  return `${formatLagosDate(input)}, ${formatLagosTime(input)}`;
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Africa/Lagos as "2026-03-07", for date inputs and the slots query. */
export function lagosToday(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/** "Sat, 7 Mar 2026" for a plain "2026-03-07" calendar day (noon, so no zone can shift it). */
export function formatLagosDay(day: string): string {
  return formatLagosDate(`${day}T12:00:00+01:00`);
}

// Working hours, breaks and days off are wall-clock times in the salon's own
// day (Lagos). The API sends and takes them as "HH:MM:SS" with no zone, so
// nothing here converts between zones: it only reads, shows and writes them.

const MINUTES_PER_DAY = 24 * 60;
const API_TIME = /^(\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?$/;

/** Minutes since midnight for an API time like "09:00:00", or null if it is not one. */
export function parseApiTime(value: string): number | null {
  const match = API_TIME.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 60 + minutes;
}

/** False for a time with seconds ("09:00:30"), which this page cannot show or keep. */
export function isWholeMinuteApiTime(value: string): boolean {
  const match = API_TIME.exec(value);
  if (!match) return false;
  return Number(match[3] ?? "0") === 0 && !(match[4] && Number(match[4]) > 0);
}

/** "09:30:00" for 570 minutes: the form the API takes. */
export function minutesToApiTime(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= MINUTES_PER_DAY) {
    throw new RangeError(`Invalid time of day: ${minutes}`);
  }
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

/** "9:30 AM" for 570 minutes since midnight. */
export function formatClockMinutes(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= MINUTES_PER_DAY) {
    throw new RangeError(`Invalid time of day: ${minutes}`);
  }
  const hours24 = Math.floor(minutes / 60);
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes % 60).padStart(2, "0")} ${period}`;
}

/** "9:00 AM" for an API time like "09:00:00". */
export function formatApiTime(value: string): string {
  const minutes = parseApiTime(value);
  if (minutes === null) throw new RangeError(`Invalid time: ${value}`);
  return formatClockMinutes(minutes);
}

/** Start times offered in the pickers: every `step` minutes from 12:00 AM to 11:45 PM. */
export function clockOptionMinutes(step = 15): number[] {
  const out: number[] = [];
  for (let m = 0; m < MINUTES_PER_DAY; m += step) out.push(m);
  return out;
}
