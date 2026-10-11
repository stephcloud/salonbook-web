import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/features/bookings/BookingStatusBadge";
import type { BookingDetail, BookingListItem } from "@/lib/api";
import { cancelledListNote, refundBadge } from "@/lib/cancel-outcome";
import {
  formatCountdown,
  isHoldExpired,
  parseApiTime,
  remainingMs,
} from "@/lib/hold";
import { formatNaira } from "@/lib/money";
import { formatServicePrice } from "@/lib/price";
import { formatLagosDateTime } from "@/lib/time";

type BookingCardProps = {
  booking: BookingListItem;
  /** The current time in ms (one shared clock for the whole list). */
  now: number;
  /** From the booking detail, only known for cancelled bookings with a refund due. */
  paymentStatus?: BookingDetail["payment_status"];
  onCancel: (booking: BookingListItem) => void;
};

export function BookingCard({
  booking,
  now,
  paymentStatus,
  onCancel,
}: BookingCardProps) {
  const { salon, service, stylist } = booking;

  // One rule for an unpaid hold that ran out (hold.ts): it decides the badge,
  // the message and which actions show.
  const expired = isHoldExpired(booking, now);
  const held = booking.status === "pending" && !expired;
  const notStarted = parseApiTime(booking.starts_at) > now;
  const canCancel = (held || booking.status === "confirmed") && notStarted;
  const depositPaid =
    booking.status === "confirmed" || booking.status === "completed";
  const refundNote =
    booking.status === "cancelled" && !expired
      ? cancelledListNote(booking.refund_due, paymentStatus)
      : null;

  const label = `${service.name} at ${salon.name}`;

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold">{service.name}</h2>
        <BookingStatusBadge
          status={booking.status}
          expired={expired}
          refund={refundBadge(paymentStatus)}
        />
      </div>

      <div className="flex flex-col gap-0.5 text-sm">
        <p className="font-semibold">{salon.name}</p>
        <p className="text-muted-foreground">with {stylist.name}</p>
        <p>{formatLagosDateTime(booking.starts_at)}</p>
      </div>

      <div className="flex flex-col gap-0.5 text-sm">
        <p className="font-semibold">{formatServicePrice(service)}</p>
        <p className="text-muted-foreground">
          {depositPaid ? "Deposit paid" : "Deposit"}{" "}
          {formatNaira(salon.deposit_amount)}
        </p>
      </div>

      {held ? (
        <p className="text-sm font-medium">
          Time left to pay:{" "}
          {formatCountdown(remainingMs(booking.created_at, now))}
        </p>
      ) : null}
      {refundNote ? (
        <p className="text-sm text-muted-foreground">{refundNote}</p>
      ) : null}
      {expired ? (
        <p className="text-sm text-muted-foreground">
          The hold ended before the deposit was paid.
        </p>
      ) : null}

      {held || canCancel || expired ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {held ? (
            <Link
              href={`/bookings/${booking.id}/pay`}
              aria-label={`Pay now for ${label}`}
              className={`${buttonVariants({ size: "lg" })} w-full sm:w-auto`}
            >
              Pay now
            </Link>
          ) : null}
          {canCancel ? (
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              aria-label={`Cancel ${label}`}
              onClick={() => onCancel(booking)}
            >
              Cancel booking
            </Button>
          ) : null}
          {expired ? (
            <Link
              href={`/book/${salon.id}`}
              aria-label={`Book again at ${salon.name}`}
              className={`${buttonVariants({ variant: "outline", size: "lg" })} w-full sm:w-auto`}
            >
              Book again
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
