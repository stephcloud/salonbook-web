import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/features/bookings/BookingStatusBadge";
import type { OwnerBooking, Service } from "@/lib/api";
import { formatLagosDateTime } from "@/lib/time";
import {
  depositLabel,
  paymentLabel,
  refundBadge,
  servicePriceLabel,
} from "@/lib/owner-bookings";

type OwnerBookingCardProps = {
  booking: OwnerBooking;
  services: Pick<Service, "id" | "price_type" | "price">[];
  depositKobo: number;
  /** Set when this booking can be cancelled; the button is hidden otherwise. */
  onCancel?: (booking: OwnerBooking) => void;
};

export function OwnerBookingCard({
  booking,
  services,
  depositKobo,
  onCancel,
}: OwnerBookingCardProps) {
  const price = servicePriceLabel(booking, services);
  // The amount is the salon's current deposit, so it is only shown where a
  // deposit was actually taken.
  const showAmount =
    booking.payment_status === "paid" ||
    booking.payment_status === "refund_pending" ||
    booking.payment_status === "refunded";

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold break-words">{booking.client_name}</p>
          <p className="text-sm text-muted-foreground">
            {formatLagosDateTime(booking.starts_at)}
          </p>
        </div>
        <BookingStatusBadge
          status={booking.status}
          refund={refundBadge(booking)}
        />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Service</dt>
        <dd className="min-w-0 break-words">{booking.service.name}</dd>
        <dt className="text-muted-foreground">Stylist</dt>
        <dd className="min-w-0 break-words">{booking.stylist.name}</dd>
        {price ? (
          <>
            <dt className="text-muted-foreground">Price</dt>
            <dd className="min-w-0 break-words">{price}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Deposit</dt>
        <dd className="min-w-0 break-words">
          {showAmount ? `${depositLabel(depositKobo)} · ` : ""}
          {paymentLabel(booking)}
        </dd>
      </dl>
      {onCancel ? (
        <Button
          variant="outline"
          className="self-start"
          aria-label={`Cancel booking for ${booking.client_name} on ${formatLagosDateTime(booking.starts_at)}`}
          onClick={() => onCancel(booking)}
        >
          Cancel
        </Button>
      ) : null}
    </li>
  );
}
