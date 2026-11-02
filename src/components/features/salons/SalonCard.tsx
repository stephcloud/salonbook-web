import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Wallet } from "lucide-react";
import type { Salon } from "@/lib/api";
import { formatNaira } from "@/lib/money";

/** Matches the grid in SalonList: 1 column, 2 from sm, 3 from lg (inside max-w-5xl). */
const SALON_CARD_SIZES =
  "(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw";

/** The whole card is one link; the deposit chip is read as its description. */
export function SalonCard({ salon }: { salon: Salon }) {
  const depositId = `salon-${salon.id}-deposit`;
  return (
    <li>
      <Link
        href={`/salons/${salon.id}`}
        aria-label={`${salon.name}, ${salon.address}`}
        aria-describedby={depositId}
        className="group relative isolate block aspect-[5/6] overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark shadow-sm shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-[translate,box-shadow] motion-safe:duration-300 motion-safe:hover:-translate-y-1"
      >
        {salon.image_url ? (
          <Image
            src={salon.image_url}
            alt=""
            fill
            unoptimized
            sizes={SALON_CARD_SIZES}
            className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div
            data-testid="salon-card-fallback"
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 size-48 rounded-full bg-primary-foreground/10" />
            <span className="font-heading text-[9rem] leading-none text-primary-foreground/15 select-none">
              {(Array.from(salon.name.trim())[0] ?? "").toUpperCase()}
            </span>
          </div>
        )}

        {/* Darkest at the bottom: the text sits where the overlay is 75% or more (6:1+ for white on a white photo). */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-foreground/90 via-foreground/75 via-60% to-transparent"
        />

        <span
          id={depositId}
          className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm"
        >
          <Wallet aria-hidden="true" className="size-4 text-primary" />
          {salon.deposit_amount === 0
            ? "No deposit"
            : `${formatNaira(salon.deposit_amount)} deposit`}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="line-clamp-2 font-sans text-lg leading-snug font-bold break-words text-primary-foreground">
              {salon.name}
            </h2>
            <p className="flex min-w-0 items-center gap-1.5 text-sm text-primary-foreground">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{salon.address}</span>
            </p>
          </div>
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-4 py-2 text-sm font-semibold text-primary"
          >
            Book
            <ArrowRight className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </li>
  );
}
