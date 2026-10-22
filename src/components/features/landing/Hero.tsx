import { ImagePlaceholder } from "@/components/features/landing/ImagePlaceholder";
import {
  LandingActions,
  type Viewer,
} from "@/components/features/landing/LandingActions";

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
      <div className="hidden lg:block" data-testid="hero-tile">
        <ImagePlaceholder slot="heroDashboard" />
      </div>
    </section>
  );
}
