"use client";

import { HoursForm } from "@/components/features/dashboard/availability/HoursForm";
import { Button } from "@/components/ui/button";
import { useSlowPending } from "@/hooks/useSlowPending";
import { useStylistAvailability } from "@/hooks/useStylistAvailability";
import { ApiError, type Availability, type Stylist } from "@/lib/api";

type StylistHoursEditorProps = {
  stylist: Stylist;
  others: Stylist[];
  /** The server's first read, when it had one. */
  initialAvailability?: Availability;
  onDirtyChange: (dirty: boolean) => void;
};

function loadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "You can only see hours for stylists in your own salon.";
    }
    if (error.status === 404) {
      return "We could not find this stylist. They may have been removed. Reload the page.";
    }
  }
  return "We could not load these hours. The server may be waking up or your connection dropped.";
}

/** Loads one stylist's rules (loading, error with retry), then shows the editor. */
export function StylistHoursEditor({
  stylist,
  others,
  initialAvailability,
  onDirtyChange,
}: StylistHoursEditorProps) {
  const query = useStylistAvailability(stylist.id, initialAvailability);
  const waking = useSlowPending(query.isPending);

  if (query.data) {
    return (
      <HoursForm
        stylist={stylist}
        others={others}
        availability={query.data}
        onDirtyChange={onDirtyChange}
      />
    );
  }

  if (query.isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-2xl bg-destructive/10 p-4"
      >
        <p className="text-sm font-medium text-destructive">
          {loadErrorMessage(query.error)}
        </p>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? "Trying…" : "Try again"}
        </Button>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        {waking
          ? "Waking up the server. This can take up to a minute, please wait."
          : `Loading ${stylist.name}'s hours…`}
      </p>
      <div aria-hidden="true" className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl bg-secondary"
          />
        ))}
      </div>
    </div>
  );
}
