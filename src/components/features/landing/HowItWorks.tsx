import { Card, CardContent } from "@/components/ui/card";
import { StepList } from "@/components/features/landing/StepList";

const CLIENT_STEPS = [
  "Pick a salon, a service and a stylist.",
  "Choose a free date and time.",
  "Pay the deposit to confirm your booking.",
];

const OWNER_STEPS = [
  "Register and set up your salon, services and stylists.",
  "Set your weekly hours, breaks and days off.",
  "Share your salon link and watch bookings arrive.",
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="flex flex-col gap-4">
      <h2 id="how-heading" className="text-2xl font-bold">
        How it works
      </h2>
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
