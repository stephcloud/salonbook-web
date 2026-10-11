import Link from "next/link";
import type { Stylist } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChoiceCard } from "@/components/features/booking/ChoiceCard";
import { EmptyState } from "@/components/features/salons/EmptyState";
import { StylistAvatar } from "@/components/features/salons/StylistAvatar";

type StylistStepProps = {
  stylists: Stylist[];
  serviceId: string;
  salonId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function StylistStep({
  stylists,
  serviceId,
  salonId,
  selectedId,
  onSelect,
  onContinue,
  onBack,
}: StylistStepProps) {
  const offering = stylists.filter((s) => s.service_ids.includes(serviceId));

  if (offering.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Choose a stylist</h2>
        <EmptyState title="No stylists offer this service yet">
          Pick another service, or check the salon page.
        </EmptyState>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="lg" onClick={onBack}>
            Change service
          </Button>
          <Link
            href={`/salons/${salonId}`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Back to the salon
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-xl font-bold">Choose a stylist</legend>
        {offering.map((stylist) => (
          <ChoiceCard
            key={stylist.id}
            name="stylist"
            value={stylist.id}
            checked={selectedId === stylist.id}
            onSelect={onSelect}
          >
            <StylistAvatar name={stylist.name} src={stylist.image_url} />
            <span className="font-semibold">{stylist.name}</span>
          </ChoiceCard>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" disabled={selectedId === null} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
