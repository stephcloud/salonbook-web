import { Clock } from "lucide-react";
import type { Service } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/features/booking/ChoiceCard";
import { EmptyState } from "@/components/features/salons/EmptyState";
import { formatNaira } from "@/lib/money";
import { formatDuration, formatServicePrice } from "@/lib/price";

type ServiceStepProps = {
  services: Service[];
  deposit: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
};

export function ServiceStep({
  services,
  deposit,
  selectedId,
  onSelect,
  onContinue,
}: ServiceStepProps) {
  if (services.length === 0) {
    return (
      <EmptyState title="No services yet">
        This salon has not added any services, so it cannot be booked yet.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-xl font-bold">Choose a service</legend>
        {services.map((service) => (
          <ChoiceCard
            key={service.id}
            name="service"
            value={service.id}
            checked={selectedId === service.id}
            onSelect={onSelect}
          >
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{service.name}</span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock aria-hidden="true" className="size-4" />
                {formatDuration(service.duration_minutes)}
              </span>
              <span className="font-semibold">
                {formatServicePrice(service)}
              </span>
              <span className="text-sm text-muted-foreground">
                Deposit: {formatNaira(deposit)}
              </span>
            </span>
          </ChoiceCard>
        ))}
      </fieldset>
      <div>
        <Button size="lg" disabled={selectedId === null} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
