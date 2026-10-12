import Link from "next/link";
import type { Salon } from "@/lib/api";
import { salonsHref } from "@/lib/salon-search";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/features/salons/EmptyState";
import { SalonCard } from "@/components/features/salons/SalonCard";

type SalonListProps = {
  salons: Salon[];
  page: number;
  pageSize: number;
  /** The search term, "" when not searching. */
  query?: string;
  /** Known exactly when searching; otherwise guessed from a full page. */
  hasNext?: boolean;
};

export function SalonList({
  salons,
  page,
  pageSize,
  query = "",
  hasNext: knownHasNext,
}: SalonListProps) {
  if (salons.length === 0) {
    if (page > 1) {
      return (
        <EmptyState title={query ? "No more results" : "No more salons"}>
          <Link
            href={salonsHref(query, 1)}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to the first page
          </Link>
        </EmptyState>
      );
    }
    if (query) {
      return (
        <EmptyState title={`No salons match '${query}'`}>
          <Link
            href="/salons"
            className={buttonVariants({ variant: "outline" })}
          >
            Show all salons
          </Link>
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
      <ul className="grid gap-4 md:grid-cols-2">
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
              href={salonsHref(query, page - 1)}
              className={buttonVariants({ variant: "outline" })}
            >
              Previous
            </Link>
          ) : null}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {hasNext ? (
            <Link
              href={salonsHref(query, page + 1)}
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
