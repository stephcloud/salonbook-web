import { BookingWizard } from "@/components/features/booking/BookingWizard";
import { ClientsOnlyNotice } from "@/components/features/booking/ClientsOnlyNotice";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import { requireUser } from "@/lib/api-server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { loadSalonBundle } from "@/lib/salon-bundle";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Book · SalonBook" };

const MAIN_CLASS =
  "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8";

export default async function BookPage({
  params,
  searchParams,
}: PageProps<"/book/[salonId]">) {
  const { salonId } = await params;
  const query = await searchParams;
  const rawService = typeof query.service === "string" ? query.service : null;

  // Where to come back to after login: the full path, including ?service=.
  const here = `/book/${encodeURIComponent(salonId)}${
    rawService ? `?service=${encodeURIComponent(rawService)}` : ""
  }`;
  const user = await requireUser(safeNextPath(here) ?? "/salons");

  if (user.role === "owner") {
    return (
      <main id="main-content" className={MAIN_CLASS}>
        <ClientsOnlyNotice />
      </main>
    );
  }

  const { salon, services, stylists } = await loadSalonBundle(salonId);
  const initialServiceId =
    services.find((service) => service.id === rawService)?.id ?? null;

  return (
    <main id="main-content" className={MAIN_CLASS}>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Book at {salon.name}</h1>
        <p className="text-muted-foreground">{salon.address}</p>
      </header>
      <QueryProvider>
        <BookingWizard
          salon={salon}
          services={services}
          stylists={stylists}
          initialServiceId={initialServiceId}
        />
      </QueryProvider>
    </main>
  );
}
