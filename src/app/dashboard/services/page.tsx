import type { Metadata } from "next";
import { OwnerSalonPage } from "@/components/features/dashboard/OwnerSalonPage";
import { ServicesSection } from "@/components/features/dashboard/ServicesSection";
import { getOwnerSalonServices } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Services · SalonBook",
  description: "Add and edit the services your salon offers.",
  robots: { index: false, follow: false },
};

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
          initialServices={await getOwnerSalonServices(salon.id)}
        />
      )}
    </OwnerSalonPage>
  );
}
