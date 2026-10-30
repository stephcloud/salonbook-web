import { lagosHour } from "@/lib/time";

export type SlotGroup = { label: string; slots: string[] };

// Lagos hours where each part of the day starts.
const PARTS_OF_DAY = [
  { label: "Morning", from: 0 },
  { label: "Afternoon", from: 12 },
  { label: "Evening", from: 17 },
];

/** Slots grouped as Morning, Afternoon and Evening (Lagos time), keeping their order and skipping empty groups. */
export function groupSlotsByPartOfDay(slots: string[]): SlotGroup[] {
  const groups = PARTS_OF_DAY.map(({ label }) => ({
    label,
    slots: [] as string[],
  }));
  for (const slot of slots) {
    const hour = lagosHour(slot);
    // Not findLastIndex: older iPhones (Safari before 15.4) do not have it.
    const index = PARTS_OF_DAY.filter(({ from }) => hour >= from).length - 1;
    groups[index].slots.push(slot);
  }
  return groups.filter((group) => group.slots.length > 0);
}
