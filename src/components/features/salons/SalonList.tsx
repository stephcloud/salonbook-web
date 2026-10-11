import Link from "next/link";
import type { Salon } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/features/salons/EmptyState";
import { SalonCard } from "@/components/features/salons/SalonCard";

type SalonListProps = {
  salons: Salon[];
  page: number;
  pageSize: number;
};

export function SalonList({ salons, page, pageSize }: SalonListProps) {
  if (salons.length === 0) {
    return page > 1 ? (
      <EmptyState title="No more salons">
        <Link href="/salons" className={buttonVariants({ variant: "outline" })}>
          Back to the first page
        </Link>
      </EmptyState>
    ) : (
      <EmptyState title="No salons yet">
        Salons will show up here as soon as owners finish setting up.
      </EmptyState>
    );
  }

  const hasPrevious = page > 1;
  // The API gives no total, so a full page means there may be more.
  const hasNext = salons.length >= pageSize;

  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2">
        {salons.map((salon) => (
          <SalonCard key={salon.id} salon={salon} />
        ))}
      </ul>
      {hasPrevious || hasNext ? (
        <nav aria-label="Salon pages" className="flex gap-3">
          {hasPrevious ? (
            <Link
              href={page === 2 ? "/salons" : `/salons?page=${page - 1}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Previous
            </Link>
          ) : null}
          {hasNext ? (
            <Link
              href={`/salons?page=${page + 1}`}
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
