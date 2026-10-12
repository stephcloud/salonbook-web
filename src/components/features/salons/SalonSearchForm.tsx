import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_QUERY_LENGTH } from "@/lib/salon-search";

/** A plain GET form: Enter submits it and the term lives in ?q=. */
export function SalonSearchForm({ query }: { query: string }) {
  return (
    <form
      method="get"
      action="/salons"
      role="search"
      className="flex flex-col gap-2"
    >
      <Label htmlFor="salon-search">Search salons by name</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="salon-search"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Salon name"
            autoComplete="off"
            className={`[&::-webkit-search-cancel-button]:hidden${query ? " pr-11" : ""}`}
          />
          {query ? (
            <Link
              href="/salons"
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-xl text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </div>
        <Button type="submit">
          <Search aria-hidden="true" className="size-4" />
          Search
        </Button>
      </div>
    </form>
  );
}
