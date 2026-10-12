"use client";

import { useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DeleteServiceDialog } from "@/components/features/dashboard/DeleteServiceDialog";
import { ServiceFormDialog } from "@/components/features/dashboard/ServiceFormDialog";
import { Button } from "@/components/ui/button";
import { useCatalogRefresh } from "@/hooks/useCatalogRefresh";
import { useNotice } from "@/hooks/useNotice";
import { useSalonServices } from "@/hooks/useSalonServices";
import type { Service } from "@/lib/api";
import { formatDuration, formatServicePrice } from "@/lib/price";

type ServicesSectionProps = {
  salonId: string;
  /** Read on the server, so the first paint is complete. */
  initialServices: Service[];
};

type Dialog =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "edit"; service: Service }
  | { kind: "delete"; service: Service };

/** The owner's services: list, add, edit and delete. */
export function ServicesSection({
  salonId,
  initialServices,
}: ServicesSectionProps) {
  const services = useSalonServices(salonId, initialServices);
  const refresh = useCatalogRefresh(salonId);
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [notice, showNotice] = useNotice();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const list = services.data;
  const close = () => setDialog({ kind: "none" });

  async function done(message: string) {
    showNotice(message);
    close();
    await refresh();
  }

  // The Delete button that opened the dialog no longer exists, so when the
  // dialog closes after a delete, focus goes to the heading. The dialog does this
  // itself as it closes, so it never waits for the lists to reload (that can
  // take seconds, and focus would sit on the page body meanwhile).
  const focusHeadingOnClose = useRef(false);
  function finalFocus() {
    if (!focusHeadingOnClose.current) return true; // the dialog's default
    focusHeadingOnClose.current = false;
    return headingRef.current;
  }
  async function deleted(message: string) {
    focusHeadingOnClose.current = true;
    await done(message);
  }

  return (
    <section aria-labelledby="services-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="services-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-bold outline-none"
        >
          Your services
        </h2>
        <Button size="lg" onClick={() => setDialog({ kind: "add" })}>
          <Plus aria-hidden="true" />
          Add a service
        </Button>
      </div>

      {/* Always mounted so a new message is announced; only takes room when it has text. */}
      <p
        role="status"
        aria-live="polite"
        className={notice ? "text-sm text-muted-foreground" : "sr-only"}
      >
        {notice}
      </p>

      {services.isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl bg-destructive/10 p-4"
        >
          <p className="text-sm font-medium text-destructive">
            We could not refresh your services. What you see may be out of date.
          </p>
          <Button
            variant="outline"
            disabled={services.isFetching}
            onClick={() => void services.refetch()}
          >
            {services.isFetching ? "Trying…" : "Try again"}
          </Button>
        </div>
      ) : null}

      {list.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
          <h3 className="font-semibold">No services yet</h3>
          <p className="text-muted-foreground">
            Add what you offer, for example a haircut or braids, with how long
            it takes and what it costs. Customers pick from this list when they
            book.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-busy={services.isFetching}>
          {list.map((service) => (
            <li
              key={service.id}
              className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="font-semibold break-words">{service.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(service.duration_minutes)} ·{" "}
                  {formatServicePrice(service)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  aria-label={`Edit ${service.name}`}
                  onClick={() => setDialog({ kind: "edit", service })}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  aria-label={`Delete ${service.name}`}
                  onClick={() => setDialog({ kind: "delete", service })}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ServiceFormDialog
        salonId={salonId}
        service={dialog.kind === "edit" ? dialog.service : null}
        open={dialog.kind === "add" || dialog.kind === "edit"}
        onClose={close}
        onSaved={done}
      />
      <DeleteServiceDialog
        service={dialog.kind === "delete" ? dialog.service : null}
        onClose={close}
        onDeleted={deleted}
        finalFocus={finalFocus}
      />
    </section>
  );
}
