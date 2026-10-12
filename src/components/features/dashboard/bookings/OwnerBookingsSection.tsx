"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingFilters } from "@/components/features/dashboard/bookings/BookingFilters";
import { OwnerBookingCard } from "@/components/features/dashboard/bookings/OwnerBookingCard";
import { Pager } from "@/components/features/dashboard/bookings/Pager";
import { EmptyState } from "@/components/features/salons/EmptyState";
import { useOwnerBookings } from "@/hooks/useOwnerBookings";
import { useSlowPending } from "@/hooks/useSlowPending";
import {
  ApiError,
  NO_OWNER_BOOKING_FILTERS,
  type OwnerBookingFilters,
  type Service,
  type Stylist,
} from "@/lib/api";
import { filterProblem, hasActiveFilters } from "@/lib/owner-bookings";

type OwnerBookingsSectionProps = {
  salonId: string;
  depositKobo: number;
  services: Service[];
  stylists: Stylist[];
};

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Please sign in again.";
    if (error.status === 403) {
      return "Only the owner of this salon can see its bookings.";
    }
    if (error.status === 422) return error.message;
  }
  return "We could not load your bookings. The server may be waking up or your connection dropped.";
}

export function OwnerBookingsSection({
  salonId,
  depositKobo,
  services,
  stylists,
}: OwnerBookingsSectionProps) {
  const [filters, setFilters] = useState<OwnerBookingFilters>(
    NO_OWNER_BOOKING_FILTERS,
  );
  const [page, setPage] = useState(1);
  const problem = filterProblem(filters);
  const query = useOwnerBookings(salonId, filters, page, problem === null);
  const slow = useSlowPending(query.isFetching);

  // After Previous/Next the button may become disabled, so focus moves to the
  // heading to keep keyboard users in place.
  const heading = useRef<HTMLHeadingElement>(null);
  const movedPage = useRef(false);
  useEffect(() => {
    if (movedPage.current) heading.current?.focus();
    movedPage.current = false;
  }, [page]);

  function changeFilters(next: OwnerBookingFilters) {
    setFilters(next);
    setPage(1);
  }

  function goToPage(next: number) {
    movedPage.current = true;
    setPage(next);
  }

  const data = query.data;
  const filtered = hasActiveFilters(filters);

  let body;
  if (problem) {
    body = null;
  } else if (query.isError && !data) {
    const text = errorText(query.error);
    const retryable =
      !(query.error instanceof ApiError) || query.error.status >= 500;
    body = (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-destructive/40"
      >
        <p className="font-semibold">{text}</p>
        {retryable ? (
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? "Retrying..." : "Retry"}
          </Button>
        ) : null}
      </div>
    );
  } else if (!data) {
    body = (
      <div className="flex flex-col gap-3">
        <div role="status" className="flex flex-col gap-1">
          <p className="font-semibold">
            {slow ? "Waking up the server..." : "Loading bookings..."}
          </p>
          {slow ? (
            <p className="text-sm text-muted-foreground">
              The first visit after a quiet spell can take up to a minute.
            </p>
          ) : null}
        </div>
        <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-secondary motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
    );
  } else if (data.bookings.length === 0) {
    body = filtered ? (
      <EmptyState title="No bookings match these filters">
        <p className="mb-3">Try a different status, stylist or date range.</p>
        <Button
          variant="outline"
          onClick={() => changeFilters(NO_OWNER_BOOKING_FILTERS)}
        >
          Clear filters
        </Button>
      </EmptyState>
    ) : page > 1 ? (
      <EmptyState title="No more bookings">
        <Button variant="outline" onClick={() => goToPage(1)}>
          Back to the first page
        </Button>
      </EmptyState>
    ) : (
      <EmptyState title="No bookings yet">
        When clients book your salon, their bookings show up here.
      </EmptyState>
    );
  } else {
    body = (
      <ul className="grid gap-4 md:grid-cols-2">
        {data.bookings.map((booking) => (
          <OwnerBookingCard
            key={booking.id}
            booking={booking}
            services={services}
            depositKobo={depositKobo}
          />
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="bookings-heading" className="flex flex-col gap-4">
      <h2
        id="bookings-heading"
        ref={heading}
        tabIndex={-1}
        className="text-lg font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        Bookings
      </h2>
      <BookingFilters
        filters={filters}
        stylists={stylists}
        onChange={changeFilters}
        onClear={() => changeFilters(NO_OWNER_BOOKING_FILTERS)}
      />
      {query.isError && data ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-2xl bg-card p-4 ring-1 ring-destructive/40"
        >
          <p className="font-semibold">{errorText(query.error)}</p>
          <p className="text-sm text-muted-foreground">
            The list below may be out of date.
          </p>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? "Retrying..." : "Retry"}
          </Button>
        </div>
      ) : null}
      {body}
      {data && !problem ? (
        <>
          <p className="text-sm text-muted-foreground">
            Earliest first, as the server sorts them.
          </p>
          <Pager
            page={page}
            hasNext={data.hasNext}
            busy={query.isFetching}
            onPrevious={() => goToPage(page - 1)}
            onNext={() => goToPage(page + 1)}
          />
        </>
      ) : null}
    </section>
  );
}
