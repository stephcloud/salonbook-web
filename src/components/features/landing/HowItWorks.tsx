import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/features/landing/SectionHeading";
import { StepList } from "@/components/features/landing/StepList";
import { CLIENT_STEPS, OWNER_STEPS } from "@/lib/landing-content";

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="flex scroll-mt-header flex-col gap-6"
    >
      <SectionHeading
        id="how-heading"
        eyebrow="Three steps"
        title="How it works"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">For clients</h3>
            <StepList steps={CLIENT_STEPS} />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">For salon owners</h3>
            <StepList steps={OWNER_STEPS} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
