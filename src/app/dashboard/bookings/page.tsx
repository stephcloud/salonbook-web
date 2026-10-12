import type { Metadata } from "next";
import { OwnerBookingsSection } from "@/components/features/dashboard/bookings/OwnerBookingsSection";
import { OwnerSalonPage } from "@/components/features/dashboard/OwnerSalonPage";
import { getSalonServices, getSalonStylists } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Bookings · SalonBook",
  description:
    "See your salon's bookings and filter them by status, stylist and date.",
  robots: { index: false, follow: false },
};

export default function OwnerBookingsPage() {
  return (
    <OwnerSalonPage
      path="/dashboard/bookings"
      title="Bookings"
      description="Who booked what at your salon. Times are Lagos time."
    >
      {async (salon) => {
        // Services give the prices and stylists fill the filter. If either
        // read fails the dashboard error page offers Retry.
        const [services, stylists] = await Promise.all([
          getSalonServices(salon.id),
          getSalonStylists(salon.id),
        ]);
        return (
          <OwnerBookingsSection
            salonId={salon.id}
            depositKobo={salon.deposit_amount}
            services={services}
            stylists={stylists}
          />
        );
      }}
    </OwnerSalonPage>
  );
}
