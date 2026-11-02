import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SalonNameSuggestions } from "@/components/features/salons/SalonNameSuggestions";
import { SalonResults } from "@/components/features/salons/SalonResults";
import { SalonResultsFallback } from "@/components/features/salons/SalonResultsFallback";
import { SalonSearchForm } from "@/components/features/salons/SalonSearchForm";
import { buttonVariants } from "@/components/ui/button";
import { isSearching, parseSearch } from "@/lib/salon-search";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Salons · SalonBook",
  description:
    "Browse salons on SalonBook, search by name and area and pick a service and a stylist.",
};

export default async function SalonsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string | string[];
    area?: string | string[];
  }>;
}) {
  const { page: rawPage, q, area } = await searchParams;
  const parsed = Number.parseInt(rawPage ?? "1", 10);
  // The API allows offsets up to 10000, which is page 500 at 20 per page.
  const page =
    Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 1;
  const search = parseSearch(q, area);
  const key = `${search.name}|${search.area ?? ""}`;
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
      {/* Keyed so the fields show the new terms after an area link or Clear navigates. */}
      <SalonSearchForm key={key} search={search} />
      {isSearching(search) ? (
        <Link
          href="/salons"
          className={cn(
            buttonVariants({ variant: "link" }),
            "-mt-3 self-start px-0",
          )}
        >
          Clear search
        </Link>
      ) : null}
      <Suspense fallback={null}>
        <SalonNameSuggestions />
      </Suspense>
      <Suspense
        key={`${key}|${page}`}
        fallback={<SalonResultsFallback searching={isSearching(search)} />}
      >
        <SalonResults search={search} page={page} />
      </Suspense>
    </main>
  );
}
