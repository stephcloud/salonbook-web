import Link from "next/link";
import type { Salon } from "@/lib/api";
import {
  NO_SEARCH,
  isSearching,
  normalizeSearch,
  salonsHref,
  type SalonSearch,
} from "@/lib/salon-search";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/features/salons/EmptyState";
import { SalonCard } from "@/components/features/salons/SalonCard";

type SalonListProps = {
  salons: Salon[];
  page: number;
  pageSize: number;
  /** The search from the URL; empty fields when not searching. */
  search?: SalonSearch;
  /** Areas from real salon addresses, offered when a search finds nothing. */
  areas?: string[];
  /** Known exactly when searching; otherwise guessed from a full page. */
  hasNext?: boolean;
};

export function SalonList({
  salons,
  page,
  pageSize,
  search = NO_SEARCH,
  areas = [],
  hasNext: knownHasNext,
}: SalonListProps) {
  if (salons.length === 0) {
    if (page > 1) {
      return (
        <EmptyState
          title={isSearching(search) ? "No more results" : "No more salons"}
        >
          <Link
            href={salonsHref(search, 1)}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to the first page
          </Link>
        </EmptyState>
      );
    }
    if (isSearching(search)) {
      const area = search.area ?? "";
      const others = areas.filter(
        (a) => normalizeSearch(a) !== normalizeSearch(area),
      );
      return (
        <EmptyState
          title={
            area && !search.name
              ? `No salons in “${area}” yet`
              : "No salons match your search"
          }
        >
          <div className="flex flex-col items-start gap-3">
            {others.length > 0 ? (
              <>
                <p>Try one of these areas</p>
                <ul className="flex flex-wrap gap-2">
                  {others.map((a) => (
                    <li key={a} className="max-w-full">
                      <Link
                        href={salonsHref({ name: "", area: a }, 1)}
                        className={cn(
                          buttonVariants({ variant: "secondary" }),
                          // A visible edge on the soft buttons (3:1); cn drops the variant's transparent border.
                          "max-w-full border-input whitespace-normal break-words",
                        )}
                      >
                        {a}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <Link
              href="/salons"
              className={buttonVariants({ variant: "outline" })}
            >
              Clear search
            </Link>
          </div>
        </EmptyState>
      );
    }
    return (
      <EmptyState title="No salons yet">
        Salons will show up here as soon as owners finish setting up.
      </EmptyState>
    );
  }

  const hasPrevious = page > 1;
  // Without a search the API gives no total, so a full page means maybe more.
  const hasNext = knownHasNext ?? salons.length >= pageSize;

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {salons.map((salon) => (
          <SalonCard key={salon.id} salon={salon} />
        ))}
      </ul>
      {hasPrevious || hasNext ? (
        <nav
          aria-label="Salon pages"
          className="flex flex-wrap items-center gap-3"
        >
          {hasPrevious ? (
            <Link
              href={salonsHref(search, page - 1)}
              className={buttonVariants({ variant: "outline" })}
            >
              Previous
            </Link>
          ) : null}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {hasNext ? (
            <Link
              href={salonsHref(search, page + 1)}
              className={buttonVariants({ variant: "outline" })}
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
