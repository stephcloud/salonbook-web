import { notFound } from "next/navigation";
import { SalonHeader } from "@/components/features/salons/SalonHeader";
import { ServiceList } from "@/components/features/salons/ServiceList";
import { StylistList } from "@/components/features/salons/StylistList";
import {
  getSalon,
  getSalonServices,
  getSalonStylists,
  isNotFound,
} from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PageProps = { params: Promise<{ id: string }> };

async function loadSalon(id: string) {
  try {
    const [salon, services, stylists] = await Promise.all([
      getSalon(id),
      getSalonServices(id),
      getSalonStylists(id),
    ]);
    return { salon, services, stylists };
  } catch (error) {
    if (isNotFound(error)) notFound();
    throw error;
  }
}

export const metadata = { title: "Salon · SalonBook" };

export default async function SalonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { salon, services, stylists } = await loadSalon(id);

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8"
    >
      <SalonHeader salon={salon} />
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
