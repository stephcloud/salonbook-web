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
