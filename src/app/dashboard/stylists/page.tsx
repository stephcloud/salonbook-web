import type { Metadata } from "next";
import { OwnerSalonPage } from "@/components/features/dashboard/OwnerSalonPage";
import { StylistsSection } from "@/components/features/dashboard/StylistsSection";
import { getOwnerSalonServices, getOwnerSalonStylists } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Stylists · SalonBook",
  description:
    "Add the stylists customers can book with and choose their services.",
  robots: { index: false, follow: false },
};

export default function StylistsPage() {
  return (
    <OwnerSalonPage
      path="/dashboard/stylists"
      title="Stylists"
      description="The people customers can book with, and the services each one offers."
    >
      {async (salon) => {
        const [services, stylists] = await Promise.all([
          getOwnerSalonServices(salon.id),
          getOwnerSalonStylists(salon.id),
        ]);
        return (
          <StylistsSection
            salonId={salon.id}
            initialServices={services}
            initialStylists={stylists}
          />
        );
      }}
    </OwnerSalonPage>
  );
}
