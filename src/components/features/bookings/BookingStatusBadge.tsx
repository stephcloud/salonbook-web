import { Badge } from "@/components/ui/badge";
import type { BookingListItem } from "@/lib/api";

const LABELS: Record<
  BookingListItem["status"],
  { text: string; variant: "pending" | "confirmed" | "cancelled" }
> = {
  pending: { text: "Awaiting payment", variant: "pending" },
  confirmed: { text: "Confirmed", variant: "confirmed" },
  completed: { text: "Completed", variant: "confirmed" },
  cancelled: { text: "Cancelled", variant: "cancelled" },
  no_show: { text: "No show", variant: "cancelled" },
};

type BookingStatusBadgeProps = {
  status: BookingListItem["status"];
  /** An unpaid hold that ran out (see `isHoldExpired`); shown as "Expired". */
  expired?: boolean;
  /** The refund's progress for a cancelled, paid booking; shown as a blue badge. */
  refund?: "Refund pending" | "Refunded" | null;
};

/**
 * Status chips: pending amber, confirmed green, cancelled and expired grey,
 * refunded blue (CLAUDE.md).
 */
export function BookingStatusBadge({
  status,
  expired = false,
  refund = null,
}: BookingStatusBadgeProps) {
  const { text, variant } = expired
    ? { text: "Expired", variant: "cancelled" as const }
    : LABELS[status];
  return (
    <span className="inline-flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      <Badge variant={variant}>{text}</Badge>
      {refund ? <Badge variant="refunded">{refund}</Badge> : null}
    </span>
  );
}
