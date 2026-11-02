import type { ComponentType } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_QUERY_LENGTH,
  SALON_SUGGESTIONS_ID,
  type SalonSearch,
} from "@/lib/salon-search";

/**
 * A plain GET form: Enter submits it, the name goes to ?q= and the location to
 * ?area=. Stacked on mobile, one pill with a divider from lg.
 */
export function SalonSearchForm({ search }: { search: SalonSearch }) {
  return (
    <form
      method="get"
      action="/salons"
      role="search"
      aria-label="Search salons"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-0 lg:rounded-full lg:border lg:border-input lg:bg-card lg:p-1.5 lg:shadow-sm"
    >
      <SearchField
        id="salon-name"
        name="q"
        label="Salon name"
        placeholder="Salon name"
        icon={Search}
        defaultValue={search.name}
        list={SALON_SUGGESTIONS_ID}
      />
      <div aria-hidden="true" className="hidden h-8 w-px bg-border lg:block" />
      <SearchField
        id="salon-area"
        name="area"
        label="Location"
        placeholder="Area or street"
        icon={MapPin}
        defaultValue={search.area ?? ""}
      />
      <Button type="submit" className="w-full lg:ml-1.5 lg:w-auto">
        <Search aria-hidden="true" className="size-4" />
        Search
      </Button>
    </form>
  );
}

function SearchField({
  id,
  label,
  icon: Icon,
  ...inputProps
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: "true" }>;
  defaultValue: string;
  list?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {/* Visible above the stacked fields; the pill's icons and placeholders carry it on lg. */}
      <Label htmlFor={id} className="lg:sr-only">
        {label}
      </Label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="search"
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          className="pl-10 lg:rounded-full lg:border-transparent lg:bg-transparent lg:focus-visible:border-ring lg:focus-visible:ring-2 lg:focus-visible:ring-ring"
          {...inputProps}
        />
      </div>
    </div>
  );
}
