import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/features/landing/Reveal";
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
      <Reveal>
        <SectionHeading
          id="problem-heading"
          eyebrow="The problem"
          title="Booking a salon should not be this hard"
        />
      </Reveal>
      <ul className="grid gap-4 lg:grid-cols-3">
        {PROBLEMS.map((problem, index) => (
          <li key={problem.title}>
            <Reveal className="h-full" delay={index * 80}>
              {/* Bar inset by the corner radius so the curve never clips it.
                  On hover it thickens with a transform, not its width. */}
              <Card className="relative h-full gap-2 rounded-3xl p-7 ring-rose/40 before:absolute before:inset-y-6 before:left-0 before:w-1 before:origin-left before:rounded-r-full before:bg-primary motion-safe:hover:shadow-md motion-safe:hover:shadow-primary/10 motion-safe:hover:before:scale-x-150 motion-safe:transition-[translate,box-shadow] motion-safe:duration-300 motion-safe:before:transition-transform motion-safe:before:duration-300 motion-safe:hover:-translate-y-1">
                <h3 className="text-xl font-semibold">{problem.title}</h3>
                <p className="text-base text-muted-foreground">
                  {problem.text}
                </p>
              </Card>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
