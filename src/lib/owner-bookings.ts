import type { OwnerBooking, OwnerBookingFilters, Service } from "@/lib/api";
import { formatNaira } from "@/lib/money";
import { formatServicePrice } from "@/lib/price";

type PaymentStatus = NonNullable<OwnerBooking["payment_status"]>;

const PAYMENT_LABELS: Record<PaymentStatus | "none", string> = {
  none: "Deposit not paid",
  pending: "Deposit not paid",
  paid: "Deposit paid",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  failed: "Payment failed",
};

/** What the deposit payment looks like for the owner. */
export function paymentLabel(booking: Pick<OwnerBooking, "payment_status">) {
  return PAYMENT_LABELS[booking.payment_status ?? "none"];
}

/** The blue refund chip next to the status, or null when no refund is involved. */
export function refundBadge(
  booking: Pick<OwnerBooking, "payment_status">,
): "Refund pending" | "Refunded" | null {
  if (booking.payment_status === "refund_pending") return "Refund pending";
  if (booking.payment_status === "refunded") return "Refunded";
  return null;
}

/**
 * The service's price, looked up in the salon's services (the booking list
 * has no amounts). Null when the service is gone, so nothing is guessed.
 */
export function servicePriceLabel(
  booking: Pick<OwnerBooking, "service">,
  services: Pick<Service, "id" | "price_type" | "price">[],
): string | null {
  const service = services.find((s) => s.id === booking.service.id);
  return service ? formatServicePrice(service) : null;
}

export function depositLabel(depositKobo: number): string {
  return formatNaira(depositKobo);
}

/** A message when the filters cannot match anything, otherwise null. */
export function filterProblem(filters: OwnerBookingFilters): string | null {
  if (filters.from && filters.to && filters.from > filters.to) {
    return "The From date must not be after the To date.";
  }
  return null;
}

export function hasActiveFilters(filters: OwnerBookingFilters): boolean {
  return Boolean(
    filters.status || filters.stylistId || filters.from || filters.to,
  );
}
