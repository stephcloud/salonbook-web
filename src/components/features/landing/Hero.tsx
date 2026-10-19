import { ImagePlaceholder } from "@/components/features/landing/ImagePlaceholder";
import {
  LandingActions,
  type Viewer,
} from "@/components/features/landing/LandingActions";

export function Hero({ viewer }: { viewer: Viewer }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="grid items-center gap-8 py-6 lg:grid-cols-2 lg:py-12"
    >
      <div className="flex flex-col items-start gap-6">
        <p className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
          Salon booking with deposits
        </p>
        <h1
          id="hero-heading"
          className="max-w-2xl text-3xl leading-tight font-bold md:text-5xl"
        >
          Online booking for your salon, with a deposit to protect your time.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
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
