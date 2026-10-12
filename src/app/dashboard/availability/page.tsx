import type { Metadata } from "next";
import { AvailabilitySection } from "@/components/features/dashboard/availability/AvailabilitySection";
import { OwnerSalonPage } from "@/components/features/dashboard/OwnerSalonPage";
import { getSalonStylists, getStylistAvailability } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Weekly hours · SalonBook",
  description: "Set each stylist's weekly hours, breaks and days off.",
  robots: { index: false, follow: false },
};

export default function AvailabilityPage() {
  return (
    <OwnerSalonPage
      path="/dashboard/availability"
      title="Weekly hours"
      description="Set the days and times each stylist works, plus breaks and days off. Times are Lagos time."
    >
      {async (salon) => {
        const stylists = await getSalonStylists(salon.id);
        const first = stylists[0];
        // If this one read fails the section loads it again with a Try again button.
        const initialAvailability = first
          ? await getStylistAvailability(first.id).catch(() => null)
          : null;
        return (
          <AvailabilitySection
            stylists={stylists}
            initialAvailability={initialAvailability}
          />
        );
      }}
    </OwnerSalonPage>
  );
}
