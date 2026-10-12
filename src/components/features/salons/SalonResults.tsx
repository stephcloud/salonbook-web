import { SalonList } from "@/components/features/salons/SalonList";
import { SALONS_PAGE_SIZE } from "@/lib/api";
import { getSalons, searchSalons } from "@/lib/api-server";

/** Fetches one page of salons (or search matches) and lists them. */
export async function SalonResults({
  query,
  page,
}: {
  query: string;
  page: number;
}) {
  const { salons, hasNext, truncated } = query
    ? await searchSalons(query, page)
    : { salons: await getSalons(page), hasNext: undefined, truncated: false };
  const status = !query
    ? ""
    : salons.length === 0 && page === 1
      ? `No salons match '${query}'`
      : `Showing salons that match '${query}', page ${page}`;

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
        query={query}
        hasNext={hasNext}
      />
    </>
  );
}
