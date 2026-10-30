import { MapPin, Phone } from "lucide-react";
import { SalonStatusBadge } from "@/components/features/dashboard/SalonStatusBadge";
import { SalonImage } from "@/components/features/salons/SalonImage";
import type { OwnerSalon } from "@/lib/api";
import { formatNaira } from "@/lib/money";
import { refundRuleText } from "@/lib/refund";
import { SALON_STATUS } from "@/lib/salon-status";

/**
 * The owner's salon at a glance: photo or tile, name, approval status, contact,
 * deposit and cancellation rule.
 */
export function SalonOverview({ salon }: { salon: OwnerSalon }) {
  return (
    <section
      aria-labelledby="salon-overview-heading"
      className="overflow-hidden rounded-2xl bg-card ring-1 ring-border"
    >
      <SalonImage src={salon.image_url} alt={`Photo of ${salon.name}`} />
      <div className="flex flex-col gap-3 p-4">
        <h2 id="salon-overview-heading" className="font-sans text-lg font-bold">
          {salon.name}
        </h2>
        <div className="flex flex-col items-start gap-1.5">
          <p className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Status:</span>
            <SalonStatusBadge status={salon.status} />
          </p>
          <p
            className={`text-sm ${
              salon.status === "suspended"
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {SALON_STATUS[salon.status].message}
          </p>
        </div>
        <p className="flex items-start gap-2 text-muted-foreground">
          <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
          {salon.address}
        </p>
        <p className="flex items-center gap-2 break-words">
          <Phone aria-hidden="true" className="size-4 shrink-0" />
          {salon.phone}
        </p>
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="font-semibold">Deposit:</dt>
            <dd>{formatNaira(salon.deposit_amount)}</dd>
          </div>
          <div>
            <dt className="sr-only">Cancellation</dt>
            <dd className="text-muted-foreground">
              {refundRuleText(salon.cancellation_hours)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
