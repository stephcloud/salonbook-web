import { SalonList } from "@/components/features/salons/SalonList";
import { SALONS_PAGE_SIZE } from "@/lib/api";
import { getSalonAreas, getSalons, searchSalons } from "@/lib/api-server";
import { isSearching, type SalonSearch } from "@/lib/salon-search";

/** Fetches one page of salons (or search matches) and lists them. */
export async function SalonResults({
  search,
  page,
}: {
  search: SalonSearch;
  page: number;
}) {
  const searching = isSearching(search);
  const { salons, hasNext, truncated } = searching
    ? await searchSalons(search, page)
    : { salons: await getSalons(page), hasNext: undefined, truncated: false };
  const noMatches = searching && salons.length === 0 && page === 1;
  // Areas for the empty state; the search batch is cached, so no extra call.
  const areas = noMatches ? await getSalonAreas().catch(() => []) : [];
  const status = !searching
    ? ""
    : noMatches
      ? "No salons match your search."
      : `Showing salons that match your search, page ${page}`;

  return (
    <>
      <p role="status" className="sr-only">
        {status}
      </p>
      {truncated ? (
        <p className="text-sm text-muted-foreground">
          Searched the first 500 salons. Newer salons may not appear.
        </p>
      ) : null}
      <SalonList
        salons={salons}
        page={page}
        pageSize={SALONS_PAGE_SIZE}
        search={search}
        areas={areas}
        hasNext={hasNext}
      />
    </>
  );
}
