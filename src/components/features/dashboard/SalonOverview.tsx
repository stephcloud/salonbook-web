import { MapPin, Phone } from "lucide-react";
import { SalonImage } from "@/components/features/salons/SalonImage";
import type { Salon } from "@/lib/api";
import { formatNaira } from "@/lib/money";
import { refundRuleText } from "@/lib/refund";

/** The owner's salon at a glance: photo or tile, name, contact, deposit and cancellation rule. */
export function SalonOverview({ salon }: { salon: Salon }) {
  return (
    <section
      aria-labelledby="salon-overview-heading"
      className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
    >
      <SalonImage src={salon.image_url} alt={`Photo of ${salon.name}`} />
      <div className="flex flex-col gap-3 p-4">
        <h2 id="salon-overview-heading" className="text-xl font-bold">
          {salon.name}
        </h2>
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
