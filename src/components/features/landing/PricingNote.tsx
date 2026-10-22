import { SectionHeading } from "@/components/features/landing/SectionHeading";

export function PricingNote() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="flex scroll-mt-4 flex-col gap-3 rounded-3xl bg-secondary p-6 md:p-8"
    >
      <SectionHeading id="pricing-heading" title="Pricing" />
      <p className="text-lg">Free while we launch, simple monthly plan later</p>
    </section>
  );
}
