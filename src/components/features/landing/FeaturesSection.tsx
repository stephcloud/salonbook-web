import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/features/landing/SectionHeading";
import { FEATURES } from "@/lib/landing-content";

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="flex scroll-mt-4 flex-col gap-6"
    >
      <SectionHeading
        id="features-heading"
        eyebrow="Features"
        title="What SalonBook does today"
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ title, text, icon: Icon }) => (
          <li key={title}>
            <Card className="h-full rounded-2xl transition-shadow hover:shadow-md motion-reduce:transition-none">
              <CardContent className="flex flex-col gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-base text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
