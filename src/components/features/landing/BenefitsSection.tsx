import { Check } from "lucide-react";
import { ImagePlaceholder } from "@/components/features/landing/ImagePlaceholder";
import { SectionHeading } from "@/components/features/landing/SectionHeading";
import { BENEFITS } from "@/lib/landing-content";

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      aria-labelledby="benefits-heading"
      className="grid scroll-mt-header items-center gap-8 md:grid-cols-2"
    >
      <div className="flex flex-col gap-6">
        <SectionHeading
          id="benefits-heading"
          eyebrow="Benefits"
          title="A calmer way to run your bookings"
        />
        <ul className="flex flex-col gap-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                <Check aria-hidden="true" className="size-4" />
              </span>
              <span className="text-base">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
      <ImagePlaceholder slot="stylistAtWork" />
    </section>
  );
}
