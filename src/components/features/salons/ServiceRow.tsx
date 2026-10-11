import Link from "next/link";
import { Clock } from "lucide-react";
import type { Service } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { formatNaira } from "@/lib/money";
import { formatDuration, formatServicePrice } from "@/lib/price";

type ServiceRowProps = {
  service: Service;
  salonId: string;
  deposit: number;
};

export function ServiceRow({ service, salonId, deposit }: ServiceRowProps) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">{service.name}</h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock aria-hidden="true" className="size-4" />
          {formatDuration(service.duration_minutes)}
        </p>
        <p className="font-semibold">{formatServicePrice(service)}</p>
        <p className="text-sm text-muted-foreground">
          Deposit: {formatNaira(deposit)}
        </p>
      </div>
      <Link
        href={`/book/${salonId}?service=${service.id}`}
        aria-label={`Book ${service.name}`}
        className={buttonVariants({ variant: "outline" })}
      >
        Book
      </Link>
    </li>
  );
}
