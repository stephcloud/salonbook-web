"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DeleteServiceDialog } from "@/components/features/dashboard/DeleteServiceDialog";
import { ServiceFormDialog } from "@/components/features/dashboard/ServiceFormDialog";
import { Button } from "@/components/ui/button";
import { useCatalogRefresh } from "@/hooks/useCatalogRefresh";
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
  const [notice, setNotice] = useState("");

  const list = services.data;
  const close = () => setDialog({ kind: "none" });

  async function done(message: string) {
    setNotice(message);
    close();
    await refresh();
  }

  return (
    <section aria-labelledby="services-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="services-heading" className="text-xl font-bold">
          Your services
        </h2>
        <Button size="lg" onClick={() => setDialog({ kind: "add" })}>
          <Plus aria-hidden="true" />
          Add a service
        </Button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-muted-foreground"
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
        <ul className="flex flex-col gap-3">
          {list.map((service) => (
            <li
              key={service.id}
              className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-0.5">
                <h3 className="font-semibold">{service.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(service.duration_minutes)} ·{" "}
                  {formatServicePrice(service)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialog({ kind: "edit", service })}
                >
                  <Pencil aria-hidden="true" />
                  Edit<span className="sr-only"> {service.name}</span>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDialog({ kind: "delete", service })}
                >
                  <Trash2 aria-hidden="true" />
                  Delete<span className="sr-only"> {service.name}</span>
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
        onDeleted={done}
      />
    </section>
  );
}
