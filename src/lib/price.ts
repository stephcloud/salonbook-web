import { formatNaira } from "@/lib/money";
import type { Service } from "@/lib/api";

export const QUOTE_PRICE_LABEL = "Price on consultation";

/** Naira for a fixed price, "Price on consultation" for quotes (or no price). */
export function formatServicePrice(
  service: Pick<Service, "price_type" | "price">,
): string {
  if (service.price_type === "quote" || service.price === null) {
    return QUOTE_PRICE_LABEL;
  }
  return formatNaira(service.price);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
