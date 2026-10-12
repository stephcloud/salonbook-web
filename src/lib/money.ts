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

/** The most a service can cost: ₦1,000,000, in kobo (the API's limit). */
export const MAX_PRICE_KOBO = 100_000_000;

/** The most a salon can ask as a deposit: ₦1,000,000, in kobo (the API's limit). */
export const MAX_DEPOSIT_KOBO = 100_000_000;

// Digits with optional thousands commas, and up to two decimals.
const NAIRA_TEXT = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/;

/**
 * Turns the naira a person typed ("5000", "5,000", "5000.5", "₦5,000.50")
 * into whole kobo, or null when it is not a positive amount with at most two
 * decimals. Integer maths only, so there is no floating-point kobo.
 */
export function nairaToKobo(text: string): number | null {
  const cleaned = text.trim().replace(/^₦\s*/, "");
  if (!NAIRA_TEXT.test(cleaned)) return null;

  const [whole, decimals = ""] = cleaned.replace(/,/g, "").split(".");
  const kobo = Number(whole) * KOBO_PER_NAIRA + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(kobo) && kobo > 0 ? kobo : null;
}

/**
 * Kobo as the text for a naira input: "5000" or "5000.50", with no thousands
 * commas so it can be edited and read back by `nairaToKobo`.
 */
export function koboToNairaInput(kobo: number): string {
  if (!Number.isInteger(kobo) || kobo < 0) {
    throw new RangeError(
      `Expected a non-negative integer in kobo, got ${kobo}`,
    );
  }
  const naira = Math.floor(kobo / KOBO_PER_NAIRA);
  const rest = kobo % KOBO_PER_NAIRA;
  return rest === 0
    ? String(naira)
    : `${naira}.${String(rest).padStart(2, "0")}`;
}
