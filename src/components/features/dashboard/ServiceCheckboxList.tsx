"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { Service } from "@/lib/api";
import { formatDuration } from "@/lib/price";

type ServiceCheckboxListProps = {
  /** Used to make unique ids when two lists are on one page. */
  idPrefix: string;
  legend: string;
  services: Service[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
};

/** One labelled checkbox per service; each row is at least 44px tall. */
export function ServiceCheckboxList({
  idPrefix,
  legend,
  services,
  selected,
  onChange,
  disabled,
}: ServiceCheckboxListProps) {
  function toggle(id: string, checked: boolean) {
    onChange(
      checked
        ? selected.includes(id)
          ? selected
          : [...selected, id]
        : selected.filter((value) => value !== id),
    );
  }

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {services.map((service) => {
        const labelId = `${idPrefix}-${service.id}-label`;
        return (
          <label
            key={service.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring"
          >
            <Checkbox
              id={`${idPrefix}-${service.id}`}
              aria-labelledby={labelId}
              checked={selected.includes(service.id)}
              disabled={disabled}
              onCheckedChange={(checked) => toggle(service.id, checked)}
            />
            <span id={labelId} className="flex flex-col">
              <span className="font-medium">{service.name}</span>
              <span className="text-sm text-muted-foreground">
                {formatDuration(service.duration_minutes)}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
