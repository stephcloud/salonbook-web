import { ImagePlaceholder } from "@/components/features/landing/ImagePlaceholder";
import { SectionHeading } from "@/components/features/landing/SectionHeading";
import { WIZARD_STEPS } from "@/components/features/booking/StepIndicator";

/** The steps are the booking wizard's own, so this cannot drift from the app. */
export function ProductPreview() {
  return (
    <section aria-labelledby="preview-heading" className="flex flex-col gap-6">
      <SectionHeading
        id="preview-heading"
        eyebrow="Booking"
        title="From service to deposit in one short flow"
        intro="Clients choose what they want, see real free times, review, then pay the deposit."
      />
      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6">
        <ol className="mb-4 flex flex-wrap gap-2">
          {WIZARD_STEPS.map((step, index) => (
            <li
              key={step.id}
              className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium"
            >
              <span
                aria-hidden="true"
                className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
              >
                {index + 1}
              </span>
              {step.label}
            </li>
          ))}
          <li className="flex items-center rounded-full bg-blush px-3 py-1.5 text-sm font-medium">
            Pay the deposit
          </li>
        </ol>
        <ImagePlaceholder slot="bookingCalendar" />
      </div>
    </section>
  );
}
