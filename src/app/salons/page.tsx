import type { Metadata } from "next";
import { Suspense } from "react";
import { SalonResults } from "@/components/features/salons/SalonResults";
import { SalonResultsFallback } from "@/components/features/salons/SalonResultsFallback";
import { SalonSearchForm } from "@/components/features/salons/SalonSearchForm";
import { parseQuery } from "@/lib/salon-search";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Salons · SalonBook",
  description:
    "Browse salons on SalonBook, search by name and pick a service and a stylist.",
};

export default async function SalonsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string | string[] }>;
}) {
  const { page: rawPage, q: rawQuery } = await searchParams;
  const parsed = Number.parseInt(rawPage ?? "1", 10);
  // The API allows offsets up to 10000, which is page 500 at 20 per page.
  const page =
    Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 1;
  const query = parseQuery(rawQuery);
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
      <SalonSearchForm query={query} />
      <Suspense
        key={`${query}|${page}`}
        fallback={<SalonResultsFallback searching={query !== ""} />}
      >
        <SalonResults query={query} page={page} />
      </Suspense>
    </main>
  );
}
