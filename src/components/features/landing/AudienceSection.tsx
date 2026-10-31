import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/features/landing/Reveal";
import { SectionHeading } from "@/components/features/landing/SectionHeading";

export function AudienceSection() {
  return (
    <section aria-labelledby="audience-heading" className="flex flex-col gap-6">
      <Reveal>
        <SectionHeading id="audience-heading" title="Who SalonBook is for" />
      </Reveal>
      <div className="grid gap-4 md:grid-cols-2">
        <Reveal className="h-full">
          <Card className="h-full bg-card">
            <CardContent className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">Clients</h3>
              <p className="text-base">
                Choose a service and a stylist, see when they are really free,
                and book without waiting for a reply. Manage your bookings in
                one place.
              </p>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal className="h-full" delay={80}>
          <Card className="h-full bg-secondary">
            <CardContent className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">Salon owners</h3>
              <p className="text-base">
                Register, set up your salon, services, stylists and hours, then
                share your salon link. Deposits help protect your time.
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
