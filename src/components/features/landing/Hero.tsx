import Image from "next/image";
import {
  LandingActions,
  type Viewer,
} from "@/components/features/landing/LandingActions";

export const HERO_PHOTO_ALT =
  "A salon with pink walls, pink chairs, gold-framed lit mirrors and a crystal chandelier";

// Full-bleed: the page renders this outside its max-width wrapper so the
// photo can reach the viewport edge on desktop. The blush tint behind it
// picks up the photo's pink walls; text only ever sits on the plain part.
export function Hero({ viewer }: { viewer: Viewer }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-gradient-to-b from-background via-secondary to-secondary lg:bg-gradient-to-r lg:from-background lg:via-background lg:to-secondary"
    >
      {/* From `lg` the text column is capped at 440px, so it always ends
          56px left of centre, and the photo starts 48px left of centre (or
          further right once it hits its 1000px cap): the two never overlap.
          `relative z-10` keeps text and focus rings above the photo. */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-10 pb-6 lg:py-24">
        <div className="flex flex-col items-start gap-6 lg:max-w-[440px]">
          <p className="rounded-full bg-card px-3 py-1 text-sm font-semibold text-primary ring-1 ring-border">
            Salon booking with deposits
          </p>
          <h1
            id="hero-heading"
            className="text-3xl leading-tight font-bold text-foreground sm:text-4xl md:text-5xl lg:text-[2.625rem]"
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
      </div>
      {/* No frame: `hero-photo-fade` (globals.css) masks the top edge below
          `lg` and the left edge from `lg`. `preload` (Next 16's name for
          `priority`) fetches it early, as it is the largest thing on screen.
          The width cap stops a very wide screen cropping the portrait photo
          down to a thin band (and scaling it up). */}
      <div
        data-testid="hero-photo"
        className="hero-photo-fade relative aspect-[4/5] w-full sm:aspect-[4/3] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[calc(50%+48px)] lg:max-w-[1000px]"
      >
        <Image
          src="/landing/hero.jpg"
          alt={HERO_PHOTO_ALT}
          fill
          preload
          sizes="(min-width: 64rem) min(calc(50vw + 48px), 1000px), 100vw"
          className="object-cover object-[50%_10%] sm:object-[50%_12%] lg:object-[50%_20%]"
        />
      </div>
      {/* Melts the bottom of the hero (photo included) into the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background"
      />
    </section>
  );
}
