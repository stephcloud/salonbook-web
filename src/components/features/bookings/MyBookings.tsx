"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { holdEndsAt, isHoldExpired } from "@/lib/hold";

const BOOKINGS_KEY = ["bookings"] as const;
const PAGE_LIMIT = 100;

// Tab styling on top of the shadcn defaults: a 44px target, a clearly filled
// active tab, readable inactive text and a visible focus ring.
const TAB_LIST_CLASS = "h-auto min-h-11 w-full gap-1 sm:w-fit";
const TAB_CLASS =
  "h-auto min-h-11 px-4 text-muted-foreground focus-visible:ring-ring data-active:bg-primary data-active:font-semibold data-active:text-primary-foreground";

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

/** When the latest running hold ends, or null when no booking is waiting for payment. */
function latestHoldEnd(bookings: BookingListItem[]): number | null {
  let latest: number | null = null;
  for (const booking of bookings) {
    if (booking.status !== "pending") continue;
    const end = holdEndsAt(booking.created_at);
    if (Number.isFinite(end) && (latest === null || end > latest)) latest = end;
  }
  return latest;
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

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY });
  }, [queryClient]);

  // One clock for the whole list: every second while a hold is running,
  // otherwise every 30 seconds. If this page is an old one restored from the
  // browser's cache, the clock notices and the list is read again.
  const now = useNow(serverNow, latestHoldEnd(bookings), refresh);
  const { upcoming, past } = splitBookings(bookings, now);
  const refunds = useBookingRefunds(past);

  // A page brought back with the Back button can show old data: read it again.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [refresh]);

  // When a hold runs out, ask the API once: it will have cancelled the booking.
  const heldCount = bookings.filter(
    (b) => b.status === "pending" && !isHoldExpired(b, now),
  ).length;
  const lastHeldCount = useRef(heldCount);
  useEffect(() => {
    if (heldCount < lastHeldCount.current) refresh();
    lastHeldCount.current = heldCount;
  }, [heldCount, refresh]);

  const [target, setTarget] = useState<BookingListItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // After cancelling, move focus to the result (the button that opened the
  // dialog is gone) and make sure it is on screen.
  const noticeBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      noticeBox.current?.focus();
      noticeBox.current?.scrollIntoView?.({ block: "nearest" });
    }, 0);
    return () => clearTimeout(timer);
  }, [notice]);

  function onCancelled({ previous, cancelled, outcome }: CancelResult) {
    // The refresh below covers a hold that ended; this booking leaving the
    // running holds because it was cancelled must not refresh a second time.
    if (previous.status === "pending" && !isHoldExpired(previous, now)) {
      lastHeldCount.current = Math.max(0, lastHeldCount.current - 1);
    }
    // Show the cancelled booking straight away, then confirm with the API.
    queryClient.setQueryData<BookingListItem[]>(BOOKINGS_KEY, (old) =>
      (old ?? []).map((b) =>
        b.id === previous.id
          ? {
              ...b,
              status: cancelled.status,
              // A cancel by the client always has a time; never leave it empty,
              // or the booking would read as an expired hold.
              cancelled_at:
                cancelled.cancelled_at ?? new Date(now).toISOString(),
              refund_due: cancelled.refund_due,
            }
          : b,
      ),
    );
    setTarget(null);
    setNotice(
      `${previous.service.name} at ${previous.salon.name} has been cancelled.${
        outcome.message ? ` ${outcome.message}` : ""
      } You can find it under Past.`,
    );
    refresh();
  }

  // Always present, so a new result is announced reliably.
  const resultNotice = (
    <div
      ref={noticeBox}
      tabIndex={-1}
      className={
        notice
          ? "flex scroll-mt-4 flex-col items-start gap-2 rounded-2xl bg-secondary p-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring"
          : "sr-only"
      }
    >
      <p role="status">{notice}</p>
      {notice ? (
        <Button
          variant="outline"
          size="default"
          aria-label="Dismiss message"
          onClick={() => setNotice(null)}
        >
          Dismiss
        </Button>
      ) : null}
    </div>
  );

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {resultNotice}
        <EmptyTab title="No bookings yet">
          When you book a salon, it shows up here.
        </EmptyTab>
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

      <Tabs defaultValue="upcoming">
        <TabsList className={TAB_LIST_CLASS}>
          <TabsTrigger value="upcoming" className={TAB_CLASS}>
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past" className={TAB_CLASS}>
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
