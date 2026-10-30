import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/features/landing/SectionHeading";

const PROBLEMS = [
  {
    title: "Booking by chat and phone",
    text: "Clients wait for a reply, owners juggle messages, and times get mixed up.",
  },
  {
    title: "No-shows",
    text: "A chair sits empty when someone does not turn up, and the time is lost.",
  },
  {
    title: "No deposits",
    text: "Without a deposit there is little reason to keep a booking or cancel in time.",
  },
];

export function ProblemSection() {
  return (
    <section aria-labelledby="problem-heading" className="flex flex-col gap-6">
      <SectionHeading
        id="problem-heading"
        eyebrow="The problem"
        title="Booking a salon should not be this hard"
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <li key={problem.title}>
            {/* Bar inset by the corner radius so the curve never clips it. */}
            <Card className="relative h-full gap-2 rounded-3xl p-7 before:absolute before:inset-y-6 before:left-0 before:w-1 before:rounded-r-full before:bg-primary">
              <h3 className="text-xl font-semibold">{problem.title}</h3>
              <p className="text-base text-muted-foreground">{problem.text}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
