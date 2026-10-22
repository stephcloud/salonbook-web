"use client";

import { useRef, useState } from "react";
import { Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { AddStylistDialog } from "@/components/features/dashboard/AddStylistDialog";
import { AssignServicesDialog } from "@/components/features/dashboard/AssignServicesDialog";
import { DeleteStylistDialog } from "@/components/features/dashboard/DeleteStylistDialog";
import { EditStylistDialog } from "@/components/features/dashboard/EditStylistDialog";
import { NoServicesNotice } from "@/components/features/dashboard/NoServicesNotice";
import { StylistAvatar } from "@/components/features/salons/StylistAvatar";
import { Button } from "@/components/ui/button";
import { useCatalogRefresh } from "@/hooks/useCatalogRefresh";
import { useNotice } from "@/hooks/useNotice";
import { useSalonServices } from "@/hooks/useSalonServices";
import { useSalonStylists } from "@/hooks/useSalonStylists";
import type { Service, Stylist } from "@/lib/api";

type StylistsSectionProps = {
  salonId: string;
  /** Read on the server, so the first paint is complete. */
  initialServices: Service[];
  initialStylists: Stylist[];
};

type Dialog =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "assign"; stylist: Stylist }
  | { kind: "edit"; stylist: Stylist }
  | { kind: "delete"; stylist: Stylist };

const editButtonId = (stylistId: string) => `edit-stylist-${stylistId}`;

/** Names of the services a stylist offers, skipping ids that no longer exist. */
function serviceNames(stylist: Stylist, services: Service[]): string[] {
  return services
    .filter((service) => stylist.service_ids.includes(service.id))
    .map((service) => service.name);
}

/** The owner's stylists: list, add (with services), assign services, edit and delete. */
export function StylistsSection({
  salonId,
  initialServices,
  initialStylists,
}: StylistsSectionProps) {
  const stylists = useSalonStylists(salonId, initialStylists);
  const services = useSalonServices(salonId, initialServices);
  const refresh = useCatalogRefresh(salonId);
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [notice, showNotice] = useNotice();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const list = stylists.data;
  const serviceList = services.data;
  const failed = stylists.isError || services.isError;
  const fetching = stylists.isFetching || services.isFetching;

  const close = () => setDialog({ kind: "none" });
  // An Edit opened from the delete dialog (after a 409) has no button of its
  // own to return to, so focus goes back to that stylist's Edit button.
  const returnTo = useRef<string | null>(null);
  function open(next: Dialog) {
    returnTo.current = null;
    setDialog(next);
  }
  function editInstead(stylist: Stylist) {
    returnTo.current = editButtonId(stylist.id);
    setDialog({ kind: "edit", stylist });
  }

  async function done(message: string) {
    showNotice(message);
    close();
    await refresh();
  }

  // After a delete, or when the stylist turns out to be gone already (404), their
  // card no longer exists, so focus goes to the heading as the dialog closes,
  // without waiting for the lists to reload.
  const focusHeadingOnClose = useRef(false);
  function finalFocus() {
    if (focusHeadingOnClose.current) {
      focusHeadingOnClose.current = false;
      return headingRef.current;
    }
    if (returnTo.current) return document.getElementById(returnTo.current);
    return true; // the dialog's default
  }
  async function removed(message: string) {
    focusHeadingOnClose.current = true;
    await done(message);
  }

  return (
    <section aria-labelledby="stylists-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="stylists-heading"
          ref={headingRef}
          tabIndex={-1}
          className="rounded-md text-xl font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          Your stylists
        </h2>
        <Button size="lg" onClick={() => open({ kind: "add" })}>
          <Plus aria-hidden="true" />
          Add a stylist
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

      {failed ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl bg-destructive/10 p-4 ring-1 ring-destructive/30"
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
            Add the people customers can book with, then choose which services
            each one offers.
          </p>
          {serviceList.length === 0 ? <NoServicesNotice /> : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-busy={fetching}>
          {list.map((stylist) => {
            const names = serviceNames(stylist, serviceList);
            return (
              <li
                key={stylist.id}
                className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StylistAvatar name={stylist.name} src={stylist.image_url} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="font-semibold break-words">
                      {stylist.name}
                    </h3>
                    {names.length > 0 ? (
                      <p className="text-sm break-words text-muted-foreground">
                        {names.join(", ")}
                      </p>
                    ) : (
                      <p className="flex items-start gap-1.5 text-sm font-medium text-status-pending-fg">
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    aria-label={`Services for ${stylist.name}`}
                    onClick={() => open({ kind: "assign", stylist })}
                  >
                    Services
                  </Button>
                  <Button
                    variant="outline"
                    id={editButtonId(stylist.id)}
                    aria-label={`Edit ${stylist.name}`}
                    onClick={() => open({ kind: "edit", stylist })}
                  >
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    aria-label={`Delete ${stylist.name}`}
                    onClick={() => open({ kind: "delete", stylist })}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddStylistDialog
        salonId={salonId}
        services={serviceList}
        open={dialog.kind === "add"}
        onClose={close}
        onCreated={() => void refresh()}
        onDone={done}
      />
      <AssignServicesDialog
        stylist={dialog.kind === "assign" ? dialog.stylist : null}
        services={serviceList}
        onClose={close}
        onSaved={done}
      />
      <EditStylistDialog
        stylist={dialog.kind === "edit" ? dialog.stylist : null}
        onClose={close}
        onSaved={done}
        onGone={removed}
        finalFocus={finalFocus}
      />
      <DeleteStylistDialog
        stylist={dialog.kind === "delete" ? dialog.stylist : null}
        onClose={close}
        onDeleted={removed}
        onGone={removed}
        onEditInstead={editInstead}
        finalFocus={finalFocus}
      />
    </section>
  );
}
