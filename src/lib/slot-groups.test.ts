import { describe, expect, it } from "vitest";
import { groupSlotsByPartOfDay } from "./slot-groups";

describe("groupSlotsByPartOfDay", () => {
  it("splits at noon and 5 PM Lagos time, keeping order", () => {
    expect(
      groupSlotsByPartOfDay([
        "2026-11-05T09:00:00+01:00",
        "2026-11-05T11:45:00+01:00",
        "2026-11-05T12:00:00+01:00",
        "2026-11-05T16:45:00+01:00",
        "2026-11-05T17:00:00+01:00",
      ]),
    ).toEqual([
      {
        label: "Morning",
        slots: ["2026-11-05T09:00:00+01:00", "2026-11-05T11:45:00+01:00"],
      },
      {
        label: "Afternoon",
        slots: ["2026-11-05T12:00:00+01:00", "2026-11-05T16:45:00+01:00"],
      },
      { label: "Evening", slots: ["2026-11-05T17:00:00+01:00"] },
    ]);
  });

  it("uses Lagos time for UTC input and skips empty groups", () => {
    // 11:30 UTC is 12:30 in Lagos.
    expect(groupSlotsByPartOfDay(["2026-11-05T11:30:00Z"])).toEqual([
      { label: "Afternoon", slots: ["2026-11-05T11:30:00Z"] },
    ]);
  });

  it("returns no groups for no slots", () => {
    expect(groupSlotsByPartOfDay([])).toEqual([]);
  });
});
