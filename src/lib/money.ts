const KOBO_PER_NAIRA = 100;

/** Formats an integer amount in kobo as naira, e.g. 500000 -> "₦5,000". */
export function formatNaira(kobo: number): string {
  if (!Number.isInteger(kobo)) {
    throw new RangeError(`Expected an integer amount in kobo, got ${kobo}`);
  }

  const abs = Math.abs(kobo);
  const naira = Math.floor(abs / KOBO_PER_NAIRA);
  const rest = abs % KOBO_PER_NAIRA;

  const whole = String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimals = rest === 0 ? "" : `.${String(rest).padStart(2, "0")}`;

  return `${kobo < 0 ? "-" : ""}₦${whole}${decimals}`;
}
