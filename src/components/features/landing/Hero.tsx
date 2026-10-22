import Image from "next/image";
import {
  LandingActions,
  type Viewer,
} from "@/components/features/landing/LandingActions";

export const HERO_PHOTO_ALT =
  "A salon with pink walls, pink chairs, gold-framed lit mirrors and a crystal chandelier";

export function Hero({ viewer }: { viewer: Viewer }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate grid items-center gap-8 overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-background to-background px-5 py-10 md:px-10 lg:grid-cols-2 lg:py-16"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute hidden lg:block -top-24 -right-24 -z-10 size-72 rounded-full bg-rose/25 blur-3xl"
      />
      <div className="flex flex-col items-start gap-6">
        <p className="rounded-full bg-card px-3 py-1 text-sm font-semibold text-primary ring-1 ring-border">
          Salon booking with deposits
        </p>
        <h1
          id="hero-heading"
          className="max-w-2xl text-3xl leading-tight font-bold text-foreground sm:text-4xl md:text-5xl"
        >
          Online booking for your salon, with a deposit to protect your time.
        </h1>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          Clients pick a service and a stylist, see real free times, and keep
          their spot with a deposit. Salon owners set up their own page and
          share one link.
        </p>
        <LandingActions viewer={viewer} />
      </div>
      {/* The gradient shows while the photo loads; `preload` (Next 16's name
          for `priority`) fetches it early, as it is the largest thing on
          screen. Under the text (4:3, at most 576px wide) below `lg`; in
          the 440px right column from `lg`, where the portrait shape fits.
          Below `lg` the crop sits a little high so the chandelier stays in
          view. */}
      <div
        data-testid="hero-photo"
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary via-rose/30 to-secondary sm:max-w-xl lg:aspect-[4/5] lg:max-w-none"
      >
        <Image
          src="/landing/hero.jpg"
          alt={HERO_PHOTO_ALT}
          fill
          preload
          sizes="(min-width: 1024px) 440px, (min-width: 648px) 576px, calc(100vw - 72px)"
          className="object-cover object-[50%_30%] lg:object-center"
        />
      </div>
    </section>
  );
}
