import { OwnerPlaceholder } from "@/components/features/dashboard/OwnerPlaceholder";

export const dynamic = "force-dynamic";

export const metadata = { title: "Stylists · SalonBook" };

export default function StylistsPage() {
  return (
    <OwnerPlaceholder
      path="/dashboard/stylists"
      title="Stylists"
      description="Add the people customers can book with."
    />
  );
}
