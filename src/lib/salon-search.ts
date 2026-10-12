export const MAX_QUERY_LENGTH = 80;

/** Lower-case, accent-folded and trimmed, so "Café " matches "cafe". */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Reads ?q= into a trimmed, length-limited term ("" when absent). */
export function parseQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim().slice(0, MAX_QUERY_LENGTH).trim();
}

export function matchesSalonName(name: string, query: string): boolean {
  const needle = normalizeSearch(query);
  return needle === "" || normalizeSearch(name).includes(needle);
}

/** The /salons URL for a search term and page (page 1 and empty term omitted). */
export function salonsHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/salons?${qs}` : "/salons";
}
