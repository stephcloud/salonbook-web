import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/features/landing/Reveal";
import { SectionHeading } from "@/components/features/landing/SectionHeading";
import { FEATURE_GROUPS } from "@/lib/landing-content";

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="flex flex-col gap-6"
    >
      <Reveal>
        <SectionHeading
          id="features-heading"
          eyebrow="Features"
          title="What SalonBook does today"
        />
      </Reveal>
      <div className="flex flex-col gap-10">
        {FEATURE_GROUPS.map(({ id, label, features }) => (
          <div
            key={id}
            role="group"
            aria-labelledby={id}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-4">
              <h3
                id={id}
                className="text-sm font-semibold tracking-wider text-primary uppercase"
              >
                {label}
              </h3>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ title, text, icon: Icon }, index) => (
                <li key={title}>
                  <Reveal className="h-full" delay={index * 80}>
                    {/* The circle is a pseudo-element clipped by the card;
                     *:relative keeps every child painted above it. */}
                    <Card className="relative h-full gap-3 rounded-3xl p-6.5 *:relative before:absolute before:-top-8 before:-right-8 before:size-27.5 before:rounded-full before:bg-secondary motion-safe:hover:shadow-lg motion-safe:hover:shadow-primary/15 motion-safe:transition-[translate,box-shadow] motion-safe:duration-300 motion-safe:hover:-translate-y-1">
                      <span className="flex size-11.5 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <h4 className="mt-1 text-lg font-bold">{title}</h4>
                      <p className="text-base text-muted-foreground">{text}</p>
                    </Card>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
