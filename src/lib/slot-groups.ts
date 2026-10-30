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
    const index = PARTS_OF_DAY.findLastIndex(({ from }) => hour >= from);
    groups[index].slots.push(slot);
  }
  return groups.filter((group) => group.slots.length > 0);
}
