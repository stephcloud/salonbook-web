import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/features/landing/SectionHeading";

export function AudienceSection() {
  return (
    <section aria-labelledby="audience-heading" className="flex flex-col gap-6">
      <SectionHeading id="audience-heading" title="Who SalonBook is for" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl bg-muted">
          <CardContent className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Clients</h3>
            <p className="text-base">
              Choose a service and a stylist, see when they are really free, and
              book without waiting for a reply. Manage your bookings in one
              place.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-blush">
          <CardContent className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Salon owners</h3>
            <p className="text-base">
              Register, set up your salon, services, stylists and hours, then
              share your salon link. Deposits help protect your time.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
