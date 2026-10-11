import type { Service } from "@/lib/api";
import { EmptyState } from "@/components/features/salons/EmptyState";
import { ServiceRow } from "@/components/features/salons/ServiceRow";

type ServiceListProps = {
  services: Service[];
  salonId: string;
  deposit: number;
};

export function ServiceList({ services, salonId, deposit }: ServiceListProps) {
  return (
    <section aria-labelledby="services-heading" className="flex flex-col gap-3">
      <h2 id="services-heading" className="text-xl font-bold">
        Services
      </h2>
      {services.length === 0 ? (
        <EmptyState title="No services yet">
          This salon has not added any services.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              salonId={salonId}
              deposit={deposit}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
