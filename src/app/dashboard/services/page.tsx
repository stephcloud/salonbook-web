import { OwnerSalonPage } from "@/components/features/dashboard/OwnerSalonPage";
import { ServicesSection } from "@/components/features/dashboard/ServicesSection";
import { getSalonServices } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Services · SalonBook" };

export default function ServicesPage() {
  return (
    <OwnerSalonPage
      path="/dashboard/services"
      title="Services"
      description="What your salon offers, with a price and how long each takes."
    >
      {async (salon) => (
        <ServicesSection
          salonId={salon.id}
          initialServices={await getSalonServices(salon.id)}
        />
      )}
    </OwnerSalonPage>
  );
}
