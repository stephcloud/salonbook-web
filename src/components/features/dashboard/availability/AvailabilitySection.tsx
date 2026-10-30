"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StylistHoursEditor } from "@/components/features/dashboard/availability/StylistHoursEditor";
import { UNSAVED_MESSAGE } from "@/hooks/useUnsavedChangesWarning";
import type { Availability, Stylist } from "@/lib/api";

type AvailabilitySectionProps = {
  stylists: Stylist[];
  /** The first stylist's rules, read on the server (null if that read failed). */
  initialAvailability: Availability | null;
};

/** Choose a stylist, then edit their weekly hours, breaks and days off. */
export function AvailabilitySection({
  stylists,
  initialAvailability,
}: AvailabilitySectionProps) {
  const [stylistId, setStylistId] = useState(stylists[0]?.id ?? "");
  // The server's read is only right for the first mount. After the owner moves
  // to another stylist it is dropped, so coming back never shows older hours
  // than the last save (the cache has them, or the page reads them again).
  const [snapshot, setSnapshot] = useState(initialAvailability);
  const dirtyRef = useRef(false);
  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  if (stylists.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
        <h2 className="font-sans text-lg font-semibold">No stylists yet</h2>
        <p className="text-muted-foreground">
          Hours belong to a stylist. Add a stylist first, then come back to set
          when they work.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/stylists"
            className={buttonVariants({ size: "lg" })}
          >
            Add a stylist
          </Link>
          <Link
            href="/dashboard"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const stylist = stylists.find((s) => s.id === stylistId) ?? stylists[0];
  if (!stylist) return null;
  const first = stylists[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-sm flex-col gap-1.5">
        <label htmlFor="stylist-select" className="text-sm font-medium">
          Stylist
        </label>
        <select
          id="stylist-select"
          value={stylist.id}
          onChange={(event) => {
            const next = event.target.value;
            if (dirtyRef.current && !window.confirm(UNSAVED_MESSAGE)) {
              // Put the menu back on the stylist whose changes are kept.
              event.target.value = stylist.id;
              return;
            }
            dirtyRef.current = false;
            setSnapshot(null);
            setStylistId(next);
          }}
          className="min-h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          {stylists.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <StylistHoursEditor
        key={stylist.id}
        stylist={stylist}
        others={stylists.filter((s) => s.id !== stylist.id)}
        initialAvailability={
          first && stylist.id === first.id ? (snapshot ?? undefined) : undefined
        }
        onDirtyChange={onDirtyChange}
      />
    </div>
  );
}
