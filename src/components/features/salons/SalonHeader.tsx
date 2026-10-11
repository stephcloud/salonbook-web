import type { ReactNode } from "react";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import type { Salon } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { SalonImage } from "@/components/features/salons/SalonImage";
import { formatNaira } from "@/lib/money";

function cancellationText(hours: number): string {
  const unit = hours === 1 ? "hour" : "hours";
  return `Refund only if you cancel more than ${hours} ${unit} before your appointment.`;
}

export function SalonHeader({
  salon,
  actions,
}: {
  salon: Salon;
  actions?: ReactNode;
}) {
  return (
    <header className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 md:grid md:grid-cols-2">
      <SalonImage
        src={salon.image_url}
        alt={`Photo of ${salon.name}`}
        className="md:aspect-auto md:h-full md:min-h-64"
      />
      <div className="flex flex-col gap-3 p-4 md:p-6">
        <h1 className="text-2xl font-bold">{salon.name}</h1>
        <p className="flex items-start gap-2 text-muted-foreground">
          <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
          {salon.address}
        </p>
        <p className="flex flex-wrap items-center gap-2 break-words">
          <Phone aria-hidden="true" className="size-4 shrink-0" />
          <a
            href={`tel:${salon.phone.replace(/\s+/g, "")}`}
            className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
          >
            {salon.phone}
          </a>
        </p>
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="font-semibold">Deposit:</dt>
            <dd>{formatNaira(salon.deposit_amount)}</dd>
          </div>
          <div>
            <dt className="sr-only">Cancellation</dt>
            <dd className="text-muted-foreground">
              {cancellationText(salon.cancellation_hours)}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-start gap-3 pt-1">
          <Link
            href={`/book/${salon.id}`}
            className={buttonVariants({ size: "lg" })}
          >
            Book now
          </Link>
          {actions}
        </div>
      </div>
    </header>
  );
}
