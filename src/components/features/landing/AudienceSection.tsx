import { CircleCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CtaButton } from "@/components/features/landing/CtaButton";
import { Reveal } from "@/components/features/landing/Reveal";
import { SectionHeading } from "@/components/features/landing/SectionHeading";
import { AUDIENCES } from "@/lib/landing-content";
import { cn } from "@/lib/utils";

const TONES = {
  light: {
    card: "bg-card ring-border",
    tag: "bg-secondary text-primary",
    tick: "text-primary",
    button: "primary",
  },
  // The circle is a pseudo-element clipped by the card (overflow-clip, so
  // focus or scrollIntoView cannot scroll the card to it); *:relative keeps
  // every child painted above it. White text stays 4.9:1 or better over it.
  plum: {
    card: "bg-primary text-primary-foreground ring-primary before:absolute before:-right-16 before:-bottom-16 before:size-48 before:rounded-full before:bg-primary-foreground/7",
    tag: "bg-primary-foreground/15 text-primary-foreground",
    tick: "text-primary-foreground",
    button: "light",
  },
} as const;

export function AudienceSection() {
  return (
    <section aria-labelledby="audience-heading" className="flex flex-col gap-6">
      <Reveal>
        <SectionHeading id="audience-heading" title="Who SalonBook is for" />
      </Reveal>
      <div className="grid gap-4 lg:grid-cols-2">
        {AUDIENCES.map(({ id, tag, title, points, cta, tone }, index) => {
          const style = TONES[tone];
          return (
            <Reveal key={id} className="h-full" delay={index * 80}>
              <Card
                role="group"
                aria-labelledby={id}
                className={cn(
                  "relative h-full gap-5 overflow-clip rounded-3xl p-8.5 text-base *:relative motion-safe:transition-[translate,box-shadow] motion-safe:duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg motion-safe:hover:shadow-primary/15",
                  style.card,
                )}
              >
                <p
                  className={cn(
                    "w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase",
                    style.tag,
                  )}
                >
                  {tag}
                </p>
                <h3 id={id} className="text-2xl font-bold">
                  {title}
                </h3>
                <ul className="flex flex-col gap-3">
                  {points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <CircleCheck
                        aria-hidden="true"
                        className={cn("mt-0.5 size-5 shrink-0", style.tick)}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  <CtaButton
                    href={cta.href}
                    variant={style.button}
                    icon="arrow"
                  >
                    {cta.label}
                  </CtaButton>
                </div>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
