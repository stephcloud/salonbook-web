import { OwnerPlaceholder } from "@/components/features/dashboard/OwnerPlaceholder";

export const dynamic = "force-dynamic";

export const metadata = { title: "Weekly hours · SalonBook" };

export default function AvailabilityPage() {
  return (
    <OwnerPlaceholder
      path="/dashboard/availability"
      title="Weekly hours"
      description="Set the days and times each stylist works, plus breaks and days off."
    />
  );
}
