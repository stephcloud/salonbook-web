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

/** Status chip: pending amber, confirmed green, cancelled grey (CLAUDE.md). */
export function BookingStatusBadge({
  status,
  cancelledAt = null,
  holdEnded = false,
}: {
  status: BookingListItem["status"];
  /** An unpaid hold that ran out is "cancelled" with no cancelled_at; show it as expired. */
  cancelledAt?: string | null;
  /** A pending booking whose 15 minutes are up, before the API has caught up. */
  holdEnded?: boolean;
}) {
  const expired =
    (status === "cancelled" && cancelledAt === null) ||
    (status === "pending" && holdEnded);
  const { text, variant } = expired
    ? { text: "Expired", variant: "cancelled" as const }
    : LABELS[status];
  return <Badge variant={variant}>{text}</Badge>;
}
