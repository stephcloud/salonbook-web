import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Salon } from "@/lib/api";
import { SalonImage } from "@/components/features/salons/SalonImage";

export function SalonCard({ salon }: { salon: Salon }) {
  return (
    <li>
      <Link
        href={`/salons/${salon.id}`}
        className="group block overflow-hidden rounded-2xl bg-card shadow-sm shadow-primary/5 ring-1 ring-border outline-none transition motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 motion-reduce:hover:translate-y-0 focus-visible:ring-3 focus-visible:ring-ring"
      >
        <SalonImage src={salon.image_url} alt="" />
        <div className="flex min-h-11 flex-col gap-1 p-4">
          <h2 className="text-xl font-bold group-hover:underline group-focus-visible:underline">
            {salon.name}
          </h2>
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {salon.address}
          </p>
        </div>
      </Link>
    </li>
  );
}
