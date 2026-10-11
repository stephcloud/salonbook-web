import { SalonList } from "@/components/features/salons/SalonList";
import { SALONS_PAGE_SIZE } from "@/lib/api";
import { getSalons } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Salons · SalonBook" };

export default async function SalonsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const parsed = Number.parseInt(rawPage ?? "1", 10);
  // The API allows offsets up to 10000, which is page 500 at 20 per page.
  const page =
    Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 1;
  const salons = await getSalons(page);

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Salons</h1>
        <p className="text-muted-foreground">
          Pick a salon to see its services and stylists.
        </p>
      </header>
      <SalonList salons={salons} page={page} pageSize={SALONS_PAGE_SIZE} />
    </main>
  );
}
