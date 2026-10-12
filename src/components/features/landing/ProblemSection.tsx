import { Card, CardContent } from "@/components/ui/card";

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
    <section aria-labelledby="problem-heading" className="flex flex-col gap-4">
      <h2 id="problem-heading" className="text-2xl font-bold">
        Booking a salon should not be this hard
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <li key={problem.title}>
            <Card className="h-full rounded-2xl">
              <CardContent className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">{problem.title}</h3>
                <p className="text-base text-muted-foreground">
                  {problem.text}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
