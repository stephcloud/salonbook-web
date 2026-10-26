import Image from "next/image";
import {
  LandingActions,
  type Viewer,
} from "@/components/features/landing/LandingActions";

export const HERO_PHOTO_ALT =
  "A smiling stylist braiding a seated client's hair in a pink salon";

// Full-bleed: the page renders this outside its max-width wrapper so the
// photo can reach the viewport edge on desktop. The blush tint behind it
// picks up the photo's pink walls; text only ever sits on the plain part.
export function Hero({ viewer }: { viewer: Viewer }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-gradient-to-b from-background via-secondary to-secondary lg:bg-gradient-to-r lg:from-background lg:via-background lg:to-secondary"
    >
      {/* From `lg` the text column is capped at 520px, wide enough for the two
          hero buttons side by side, so it always ends 24px right of centre, and
          the photo starts 32px right of centre (or further right once it hits
          its 1000px cap): the two never overlap.
          `relative z-10` keeps text and focus rings above the photo.
          The photo spans the section's full height and this block sets that
          height, so equal top and bottom padding from `lg` centres the text
          against the photo. */}
      <div
        data-testid="hero-text"
        className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-6 pb-6 lg:py-16"
      >
        <div className="flex flex-col items-start gap-6 lg:max-w-[520px]">
          <h1
            id="hero-heading"
            className="max-w-2xl text-3xl leading-tight font-bold text-foreground sm:text-4xl md:text-5xl lg:text-[2.625rem]"
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
          The width cap stops a very wide screen cropping the photo down to
          a thin band (and scaling it up). The photo is mirrored so the
          stylist stands on the right; the crop keeps both faces clear of
          the fade: centred on the pair below `lg`, shifted left from `lg`
          so the client's face sits past the left fade. From `lg` the crop is
          anchored near the top (15%): when a wide screen makes the frame
          wider than the photo's shape, it is cut top and bottom, and this
          keeps the stylist's hair clear of the header. On narrower screens
          (up to about 1500px, depending on the text block's height) the
          photo fits the frame's height and nothing is cut. */}
      <div
        data-testid="hero-photo"
        className="hero-photo-fade relative aspect-[4/5] w-full sm:aspect-[4/3] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[calc(50%-32px)] lg:max-w-[1000px]"
      >
        <Image
          src="/landing/hero.jpg"
          alt={HERO_PHOTO_ALT}
          fill
          preload
          sizes="(min-width: 64rem) min(calc(50vw - 32px), 1000px), 100vw"
          className="object-cover object-[57%_50%] lg:object-[33%_15%]"
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
