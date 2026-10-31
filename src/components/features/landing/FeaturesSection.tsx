import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/features/landing/Reveal";
import { SectionHeading } from "@/components/features/landing/SectionHeading";
import { FEATURES } from "@/lib/landing-content";

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
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ title, text, icon: Icon }, index) => (
          <li key={title}>
            {/* The stagger restarts on each desktop row of four. */}
            <Reveal className="h-full" delay={(index % 4) * 80}>
              <Card className="h-full rounded-2xl transition-shadow hover:shadow-md motion-reduce:transition-none">
                <CardContent className="flex flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-base text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
