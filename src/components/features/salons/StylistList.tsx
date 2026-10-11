import type { Stylist } from "@/lib/api";
import { EmptyState } from "@/components/features/salons/EmptyState";
import { StylistAvatar } from "@/components/features/salons/StylistAvatar";

export function StylistList({ stylists }: { stylists: Stylist[] }) {
  return (
    <section aria-labelledby="stylists-heading" className="flex flex-col gap-3">
      <h2 id="stylists-heading" className="text-xl font-bold">
        Stylists
      </h2>
      {stylists.length === 0 ? (
        <EmptyState title="No stylists yet">
          This salon has not added any stylists.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {stylists.map((stylist) => (
            <li
              key={stylist.id}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <StylistAvatar name={stylist.name} src={stylist.image_url} />
              <p className="font-semibold">{stylist.name}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
