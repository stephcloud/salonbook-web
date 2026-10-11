import { OwnerPlaceholder } from "@/components/features/dashboard/OwnerPlaceholder";

export const dynamic = "force-dynamic";

export const metadata = { title: "Services · SalonBook" };

export default function ServicesPage() {
  return (
    <OwnerPlaceholder
      path="/dashboard/services"
      title="Services"
      description="Add the services your salon offers, with a price and how long each takes."
    />
  );
}
