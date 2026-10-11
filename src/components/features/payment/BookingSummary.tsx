import {
  SUMMARY_LIST_CLASS,
  SummaryRow,
} from "@/components/features/booking/SummaryRow";
import type { BookingDetail } from "@/lib/api";
import { formatNaira } from "@/lib/money";
import { formatDuration, formatServicePrice } from "@/lib/price";
import { formatLagosDateTime } from "@/lib/time";

type BookingSummaryProps = {
  booking: Pick<BookingDetail, "salon" | "service" | "stylist" | "starts_at">;
};

/** Salon, service, stylist, time (Lagos), price or "Price on consultation", and the deposit. */
export function BookingSummary({ booking }: BookingSummaryProps) {
  const { salon, service, stylist, starts_at } = booking;
  return (
    <dl className={SUMMARY_LIST_CLASS}>
      <SummaryRow label="Salon">
        <span className="font-semibold">{salon.name}</span>
        <br />
        <span className="text-sm text-muted-foreground">{salon.address}</span>
      </SummaryRow>
      <SummaryRow label="Service">
        <span className="font-semibold">{service.name}</span>{" "}
        <span className="text-sm text-muted-foreground">
          ({formatDuration(service.duration_minutes)})
        </span>
      </SummaryRow>
      <SummaryRow label="Stylist">
        <span className="font-semibold">{stylist.name}</span>
      </SummaryRow>
      <SummaryRow label="When">
        <span className="font-semibold">{formatLagosDateTime(starts_at)}</span>
      </SummaryRow>
      <SummaryRow label="Price">
        <span className="font-semibold">{formatServicePrice(service)}</span>
      </SummaryRow>
      <SummaryRow label="Deposit">
        <span className="font-semibold">
          {formatNaira(salon.deposit_amount)}
        </span>
      </SummaryRow>
    </dl>
  );
}
