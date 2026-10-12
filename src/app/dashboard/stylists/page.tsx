import { OwnerSalonPage } from "@/components/features/dashboard/OwnerSalonPage";
import { StylistsSection } from "@/components/features/dashboard/StylistsSection";
import { getSalonServices, getSalonStylists } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Stylists · SalonBook" };

export default function StylistsPage() {
  return (
    <OwnerSalonPage
      path="/dashboard/stylists"
      title="Stylists"
      description="The people customers can book with, and the services each one offers."
    >
      {async (salon) => {
        const [services, stylists] = await Promise.all([
          getSalonServices(salon.id),
          getSalonStylists(salon.id),
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
