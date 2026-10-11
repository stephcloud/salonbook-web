import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/features/payment/BookingStatusBadge";
import { EmptyState } from "@/components/features/salons/EmptyState";
import type { BookingListItem } from "@/lib/api";
import { isHoldExpired } from "@/lib/hold";
import { formatLagosDateTime } from "@/lib/time";

type BookingListProps = {
  bookings: BookingListItem[];
  /** The current time in ms; passed in so the list renders the same everywhere. */
  now: number;
};

export function BookingList({ bookings, now }: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <EmptyState title="No bookings yet">
        <p className="mb-3">When you book a salon, it shows up here.</p>
        <Link
          href="/salons"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Browse salons
        </Link>
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {bookings.map((booking) => {
        // Unpaid bookings are held for 15 minutes from when they were made.
        // One rule decides the badge, the message and the actions.
        const expired = isHoldExpired(booking, now);
        const canPay = booking.status === "pending" && !expired;
        return (
          <li
            key={booking.id}
            className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">{booking.salon.name}</h2>
              <BookingStatusBadge status={booking.status} expired={expired} />
            </div>
            <div className="flex flex-col gap-0.5 text-sm">
              <p className="font-semibold">{booking.service.name}</p>
              <p className="text-muted-foreground">
                with {booking.stylist.name}
              </p>
              <p>{formatLagosDateTime(booking.starts_at)}</p>
            </div>
            {canPay ? (
              <Link
                href={`/bookings/${booking.id}/pay`}
                aria-label={`Pay now for ${booking.service.name} at ${booking.salon.name}`}
                className={buttonVariants({ size: "lg" })}
              >
                Pay now
              </Link>
            ) : null}
            {expired ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">
                  The hold ended before the deposit was paid.
                </p>
                <Link
                  href={`/book/${booking.salon.id}`}
                  aria-label={`Book again at ${booking.salon.name}`}
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Book again
                </Link>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
