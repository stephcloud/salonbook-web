import { Reveal } from "@/components/features/landing/Reveal";
import { SectionHeading } from "@/components/features/landing/SectionHeading";

export function PricingNote() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="rounded-3xl bg-secondary p-6 md:p-8"
    >
      {/* Reveal sits inside so the #pricing anchor target is never shifted
          by the reveal transform. */}
      <Reveal className="flex flex-col gap-3">
        <SectionHeading id="pricing-heading" title="Pricing" />
        <p className="text-lg">
          Free while we launch, simple monthly plan later
        </p>
      </Reveal>
    </section>
  );
}
