"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard } from "@/components/features/bookings/BookingCard";
import {
  CancelDialog,
  type CancelResult,
} from "@/components/features/bookings/CancelDialog";
import { EmptyState } from "@/components/features/salons/EmptyState";
import { useBookingRefunds } from "@/hooks/useBookingRefunds";
import { useNow } from "@/hooks/useNow";
import { listBookings, type BookingListItem } from "@/lib/api";
import { splitBookings } from "@/lib/booking-tabs";
import { isHoldExpired } from "@/lib/hold";

const BOOKINGS_KEY = ["bookings"] as const;
const PAGE_LIMIT = 100;

type MyBookingsProps = {
  /** The list as the server read it. */
  initialBookings: BookingListItem[];
  /** The server's clock (ms) when it read the list. */
  serverNow: number;
};

function EmptyTab({ title, children }: { title: string; children: string }) {
  return (
    <EmptyState title={title}>
      <p className="mb-3">{children}</p>
      <Link
        href="/salons"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Browse salons
      </Link>
    </EmptyState>
  );
}

export function MyBookings({ initialBookings, serverNow }: MyBookingsProps) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BOOKINGS_KEY,
    queryFn: () => listBookings(PAGE_LIMIT),
    initialData: initialBookings,
    staleTime: 30_000,
  });
  const bookings = query.data;

  // One clock for the whole list: every second while an unpaid booking is
  // showing a countdown, otherwise every 30 seconds.
  const now = useNow(
    serverNow,
    bookings.some((b) => b.status === "pending"),
  );
  const { upcoming, past } = splitBookings(bookings, now);
  const refunds = useBookingRefunds(past);

  // When a hold runs out, ask the API once: it will have cancelled the booking.
  const heldCount = bookings.filter(
    (b) => b.status === "pending" && !isHoldExpired(b, now),
  ).length;
  const lastHeldCount = useRef(heldCount);
  useEffect(() => {
    if (heldCount < lastHeldCount.current) {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY });
    }
    lastHeldCount.current = heldCount;
  }, [heldCount, queryClient]);

  const [target, setTarget] = useState<BookingListItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY });
  }

  function onCancelled({ previous, cancelled, outcome }: CancelResult) {
    // Show the cancelled booking straight away, then confirm with the API.
    queryClient.setQueryData<BookingListItem[]>(BOOKINGS_KEY, (old) =>
      (old ?? []).map((b) =>
        b.id === previous.id
          ? {
              ...b,
              status: cancelled.status,
              cancelled_at: cancelled.cancelled_at,
              refund_due: cancelled.refund_due,
            }
          : b,
      ),
    );
    setTarget(null);
    setNotice(
      `${previous.service.name} at ${previous.salon.name} is cancelled. ${outcome.message}`,
    );
    refresh();
  }

  // Always present, so a new result is announced reliably.
  const resultNotice = (
    <div
      role="status"
      className={
        notice ? "rounded-2xl bg-secondary p-4 text-sm font-medium" : "sr-only"
      }
    >
      {notice}
    </div>
  );

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {resultNotice}
        <EmptyState title="No bookings yet">
          <p className="mb-3">When you book a salon, it shows up here.</p>
          <Link
            href="/salons"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Browse salons
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {resultNotice}

      {query.isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-2xl bg-card p-4 ring-1 ring-destructive/40"
        >
          <p className="font-semibold">We could not refresh your bookings.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="upcoming">
        <TabsList className="h-auto min-h-11 w-full sm:w-fit">
          <TabsTrigger value="upcoming" className="min-h-11 px-4">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="min-h-11 px-4">
            Past ({past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="pt-2">
          {upcoming.length === 0 ? (
            <EmptyTab title="No upcoming bookings">
              Book a salon and it shows up here.
            </EmptyTab>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {upcoming.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  now={now}
                  onCancel={setTarget}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="past" className="pt-2">
          {past.length === 0 ? (
            <EmptyTab title="No past bookings yet">
              Finished and cancelled bookings show up here.
            </EmptyTab>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {past.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  now={now}
                  paymentStatus={refunds[booking.id]}
                  onCancel={setTarget}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {bookings.length >= PAGE_LIMIT ? (
        <p className="text-sm text-muted-foreground">
          Showing your {PAGE_LIMIT} latest bookings.
        </p>
      ) : null}

      <CancelDialog
        booking={target}
        onClose={() => setTarget(null)}
        onCancelled={onCancelled}
        onStale={refresh}
      />
    </div>
  );
}
