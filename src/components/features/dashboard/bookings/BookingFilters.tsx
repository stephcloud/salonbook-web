"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/features/dashboard/bookings/NativeSelect";
import type { BookingStatus, OwnerBookingFilters, Stylist } from "@/lib/api";
import { filterProblem, hasActiveFilters } from "@/lib/owner-bookings";

const STATUS_OPTIONS: { value: BookingStatus | ""; label: string }[] = [
  { value: "", label: "Any status" },
  { value: "pending", label: "Awaiting payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
];

type BookingFiltersProps = {
  filters: OwnerBookingFilters;
  stylists: Pick<Stylist, "id" | "name">[];
  onChange: (filters: OwnerBookingFilters) => void;
  onClear: () => void;
};

export function BookingFilters({
  filters,
  stylists,
  onChange,
  onClear,
}: BookingFiltersProps) {
  const problem = filterProblem(filters);

  return (
    <form
      aria-label="Filter bookings"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <NativeSelect
          id="filter-status"
          label="Status"
          value={filters.status}
          onChange={(status) =>
            onChange({ ...filters, status: status as BookingStatus | "" })
          }
          options={STATUS_OPTIONS}
        />
        <NativeSelect
          id="filter-stylist"
          label="Stylist"
          value={filters.stylistId}
          onChange={(stylistId) => onChange({ ...filters, stylistId })}
          options={[
            { value: "", label: "Any stylist" },
            ...stylists.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-from">From</Label>
          <Input
            id="filter-from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            aria-invalid={problem ? true : undefined}
            aria-describedby={
              problem ? "filter-help filter-problem" : "filter-help"
            }
            onChange={(event) =>
              onChange({ ...filters, from: event.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-to">To</Label>
          <Input
            id="filter-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            aria-invalid={problem ? true : undefined}
            aria-describedby={
              problem ? "filter-help filter-problem" : "filter-help"
            }
            onChange={(event) =>
              onChange({ ...filters, to: event.target.value })
            }
          />
        </div>
      </div>
      <p id="filter-help" className="text-sm text-muted-foreground">
        Dates are Lagos days, and both ends are included.
      </p>
      {problem ? (
        <p
          id="filter-problem"
          role="alert"
          className="text-sm text-destructive"
        >
          {problem}
        </p>
      ) : null}
      {hasActiveFilters(filters) ? (
        <div>
          <Button type="button" variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </form>
  );
}
