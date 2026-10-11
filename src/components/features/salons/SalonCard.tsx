import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Salon } from "@/lib/api";
import { SalonImage } from "@/components/features/salons/SalonImage";

export function SalonCard({ salon }: { salon: Salon }) {
  return (
    <li>
      <Link
        href={`/salons/${salon.id}`}
        className="group block overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring"
      >
        <SalonImage src={salon.image_url} alt="" />
        <div className="flex min-h-11 flex-col gap-1 p-4">
          <h2 className="text-lg font-bold group-hover:underline group-focus-visible:underline">
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
