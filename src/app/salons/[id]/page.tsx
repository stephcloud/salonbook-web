import { CopySalonLinkButton } from "@/components/features/salons/CopySalonLinkButton";
import { SalonHeader } from "@/components/features/salons/SalonHeader";
import { ServiceList } from "@/components/features/salons/ServiceList";
import { StylistList } from "@/components/features/salons/StylistList";
import { getSalon } from "@/lib/api-server";
import { loadSalonBundle } from "@/lib/salon-bundle";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const salon = await getSalon(id);
    return { title: `${salon.name} · SalonBook` };
  } catch {
    return { title: "Salon · SalonBook" };
  }
}

export default async function SalonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { salon, services, stylists } = await loadSalonBundle(id);

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8"
    >
      <SalonHeader
        salon={salon}
        actions={<CopySalonLinkButton salonId={salon.id} />}
      />
      <div className="grid gap-8 md:grid-cols-[3fr_2fr] md:items-start">
        <ServiceList
          services={services}
          salonId={salon.id}
          deposit={salon.deposit_amount}
        />
        <StylistList stylists={stylists} />
      </div>
    </main>
  );
}
