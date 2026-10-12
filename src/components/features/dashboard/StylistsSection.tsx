"use client";

import { useState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { AddStylistDialog } from "@/components/features/dashboard/AddStylistDialog";
import { AssignServicesDialog } from "@/components/features/dashboard/AssignServicesDialog";
import { StylistAvatar } from "@/components/features/salons/StylistAvatar";
import { Button } from "@/components/ui/button";
import { useCatalogRefresh } from "@/hooks/useCatalogRefresh";
import { useSalonServices } from "@/hooks/useSalonServices";
import { useSalonStylists } from "@/hooks/useSalonStylists";
import type { Service, Stylist } from "@/lib/api";

type StylistsSectionProps = {
  salonId: string;
  /** Read on the server, so the first paint is complete. */
  initialServices: Service[];
  initialStylists: Stylist[];
};

/** Names of the services a stylist offers, skipping ids that no longer exist. */
function serviceNames(stylist: Stylist, services: Service[]): string[] {
  return services
    .filter((service) => stylist.service_ids.includes(service.id))
    .map((service) => service.name);
}

/**
 * The owner's stylists: list, add (with services) and assign services. The API
 * has no edit or delete for stylists yet, so there are none here.
 */
export function StylistsSection({
  salonId,
  initialServices,
  initialStylists,
}: StylistsSectionProps) {
  const stylists = useSalonStylists(salonId, initialStylists);
  const services = useSalonServices(salonId, initialServices);
  const refresh = useCatalogRefresh(salonId);
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState<Stylist | null>(null);
  const [notice, setNotice] = useState("");

  const list = stylists.data;
  const serviceList = services.data;
  const failed = stylists.isError || services.isError;
  const fetching = stylists.isFetching || services.isFetching;

  async function done(message: string) {
    setNotice(message);
    setAdding(false);
    setAssigning(null);
    await refresh();
  }

  return (
    <section aria-labelledby="stylists-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="stylists-heading" className="text-xl font-bold">
          Your stylists
        </h2>
        <Button size="lg" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" />
          Add a stylist
        </Button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-muted-foreground"
      >
        {notice}
      </p>

      {failed ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl bg-destructive/10 p-4"
        >
          <p className="text-sm font-medium text-destructive">
            We could not refresh your stylists. What you see may be out of date.
          </p>
          <Button
            variant="outline"
            disabled={fetching}
            onClick={() => {
              void stylists.refetch();
              void services.refetch();
            }}
          >
            {fetching ? "Trying…" : "Try again"}
          </Button>
        </div>
      ) : null}

      {list.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
          <h3 className="font-semibold">No stylists yet</h3>
          <p className="text-muted-foreground">
            Add the people customers can book with. Add your services first,
            then choose which ones each stylist offers.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((stylist) => {
            const names = serviceNames(stylist, serviceList);
            return (
              <li
                key={stylist.id}
                className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <StylistAvatar name={stylist.name} src={stylist.image_url} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="font-semibold break-words">
                      {stylist.name}
                    </h3>
                    {names.length > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {names.join(", ")}
                      </p>
                    ) : (
                      <p className="flex items-start gap-1.5 text-sm font-medium text-amber-900">
                        <TriangleAlert
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0"
                        />
                        Clients can&apos;t book this stylist until you assign a
                        service.
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline" onClick={() => setAssigning(stylist)}>
                  Services<span className="sr-only"> for {stylist.name}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AddStylistDialog
        salonId={salonId}
        services={serviceList}
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => void refresh()}
        onDone={done}
      />
      <AssignServicesDialog
        stylist={assigning}
        services={serviceList}
        onClose={() => setAssigning(null)}
        onSaved={done}
      />
    </section>
  );
}
