export const MAX_QUERY_LENGTH = 80;
/** The id that links the search input to its suggestions <datalist>. */
export const SALON_SUGGESTIONS_ID = "salon-name-suggestions";

/** Lower-case, accent-folded and trimmed, so "Café " matches "cafe". */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Reads ?q= into a trimmed, length-limited term ("" when absent). */
export function parseQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim().slice(0, MAX_QUERY_LENGTH).trim();
}

/** True when the term is empty or found in the salon's name or address. */
export function matchesSalon(
  salon: { name: string; address: string },
  query: string,
): boolean {
  const needle = normalizeSearch(query);
  return (
    needle === "" ||
    normalizeSearch(salon.name).includes(needle) ||
    normalizeSearch(salon.address).includes(needle)
  );
}

export const MAX_AREAS = 8;
const STREET_WORD =
  /\b(street|st|road|rd|avenue|ave|close|crescent|lane|drive)\b/i;

/**
 * Area names taken from real addresses: the parts after the first comma, or the
 * whole address when it has none. Street lines (a digit or a word like
 * "street") and parts with fewer than 2 letters are skipped. Most shared first,
 * then A to Z.
 */
export function salonAreas(addresses: string[]): string[] {
  const areas = new Map<string, { label: string; count: number }>();
  for (const address of addresses) {
    const parts = address.split(",").map((part) => part.trim());
    for (const part of parts.length > 1 ? parts.slice(1) : parts) {
      if (
        /\d/.test(part) ||
        STREET_WORD.test(part) ||
        (part.match(/\p{L}/gu) ?? []).length < 2
      )
        continue;
      const key = normalizeSearch(part);
      const area = areas.get(key);
      if (area) area.count += 1;
      else areas.set(key, { label: part, count: 1 });
    }
  }
  return [...areas.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, MAX_AREAS)
    .map((area) => area.label);
}

/** The /salons URL for a search term and page (page 1 and empty term omitted). */
export function salonsHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/salons?${qs}` : "/salons";
}
