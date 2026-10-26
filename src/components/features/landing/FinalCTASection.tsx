import { ImagePlaceholder } from "@/components/features/landing/ImagePlaceholder";
import {
  LandingActions,
  type Viewer,
} from "@/components/features/landing/LandingActions";

export function FinalCTASection({ viewer }: { viewer: Viewer }) {
  return (
    <section
      aria-labelledby="cta-heading"
      className="grid items-center gap-6 rounded-3xl bg-muted p-6 md:grid-cols-2 md:p-10"
    >
      <div className="flex flex-col items-start gap-4">
        <h2 id="cta-heading" className="text-2xl font-bold md:text-3xl">
          Ready to take bookings online?
        </h2>
        <p className="text-lg text-muted-foreground">
          Find a salon to book, or register yours and share your link.
        </p>
        {/* From `md` the column is too narrow for two pills side by side, so
            they stack and share the widest one's width. */}
        <LandingActions viewer={viewer} className="md:w-fit md:flex-col" />
      </div>
      <ImagePlaceholder slot="salonInterior" className="hidden md:flex" />
    </section>
  );
}
