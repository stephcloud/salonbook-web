"use client";

import { useEffect, useRef, useState } from "react";
import { SalonForm } from "@/components/features/dashboard/SalonForm";
import { Button } from "@/components/ui/button";
import type { Salon } from "@/lib/api";

/** A button that opens the edit form in place and closes it after saving. */
export function EditSalonSection({ salon }: { salon: Salon }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Move focus into the form when it opens, and back to the button when it closes.
  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>("input")?.focus();
    } else if (wasOpen.current) {
      buttonRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <section
      aria-labelledby="edit-salon-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="edit-salon-heading" className="sr-only">
        Edit salon details
      </h2>
      {open ? (
        <div
          ref={panelRef}
          className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border"
        >
          <SalonForm
            mode="edit"
            salon={salon}
            onSaved={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </div>
      ) : (
        <div>
          <Button
            ref={buttonRef}
            variant="outline"
            size="lg"
            onClick={() => setOpen(true)}
          >
            Edit salon details
          </Button>
        </div>
      )}
    </section>
  );
}
