import { describe, expect, it } from "vitest";
import type { AvailabilityRule } from "@/lib/api";
import { draftToRules, rulesToDraft } from "./convert";
import { copyDayHours, copyDraft, emptyDraft } from "./draft";

let n = 0;
function rule(
  kind: AvailabilityRule["kind"],
  weekday: number | null,
  start: string | null,
  end: string | null,
  off: string | null = null,
): AvailabilityRule {
  n += 1;
  return {
    id: `id-${n}`,
    kind,
    weekday,
    start_time: start,
    end_time: end,
    off_date: off,
  };
}

function plain(rules: { [K in keyof AvailabilityRule]?: unknown }[]) {
  return rules.map(({ kind, weekday, start_time, end_time, off_date }) => ({
    kind,
    weekday,
    start_time,
    end_time,
    off_date,
  }));
}

describe("rulesToDraft", () => {
  it("is all closed for a stylist with no rules", () => {
    const { draft, issues } = rulesToDraft([]);
    expect(draft.days).toHaveLength(7);
    expect(draft.days.every((d) => !d.open)).toBe(true);
    expect(draft.daysOff).toEqual([]);
    expect(issues).toEqual([]);
  });

  it("reads weekday 0 as Monday, with its break and times in minutes", () => {
    const { draft, issues } = rulesToDraft([
      rule("working", 0, "09:00:00", "17:00:00"),
      rule("break", 0, "12:00:00", "13:00:00"),
      rule("working", 6, "10:30:00", "14:00:00"),
      rule("day_off", null, null, null, "2026-12-25"),
    ]);
    expect(draft.days[0]).toEqual({
      open: true,
      start: 540,
      end: 1020,
      breaks: [{ start: 720, end: 780 }],
    });
    expect(draft.days[6]).toMatchObject({ open: true, start: 630, end: 840 });
    expect(draft.days[1]?.open).toBe(false);
    expect(draft.daysOff).toEqual(["2026-12-25"]);
    expect(issues).toEqual([]);
  });

  it("reports a split shift and shows only the first block", () => {
    const { draft, issues } = rulesToDraft([
      rule("working", 1, "13:00:00", "17:00:00"),
      rule("working", 1, "09:00:00", "12:00:00"),
    ]);
    expect(draft.days[1]).toMatchObject({ open: true, start: 540, end: 720 });
    expect(issues).toEqual([
      "Tuesday has 2 separate blocks of hours. Only the first one is shown.",
    ]);
  });

  it("reports a break on a day with no hours", () => {
    const { draft, issues } = rulesToDraft([
      rule("break", 2, "12:00:00", "13:00:00"),
    ]);
    expect(draft.days[2]?.open).toBe(false);
    expect(issues).toEqual(["Wednesday has a break but no working hours."]);
  });

  it("reports times with seconds instead of dropping them quietly", () => {
    const { draft, issues } = rulesToDraft([
      rule("working", 3, "09:00:30", "17:00:00"),
    ]);
    expect(draft.days[3]?.open).toBe(false);
    expect(issues).toHaveLength(1);
  });

  it("keeps days off sorted, past ones included", () => {
    const { draft } = rulesToDraft([
      rule("day_off", null, null, null, "2030-01-02"),
      rule("day_off", null, null, null, "2020-01-01"),
    ]);
    expect(draft.daysOff).toEqual(["2020-01-01", "2030-01-02"]);
  });
});

describe("draftToRules", () => {
  it("writes API times and weekdays: hours, then breaks, then days off", () => {
    const draft = emptyDraft();
    draft.days[0] = {
      open: true,
      start: 540,
      end: 1020,
      breaks: [{ start: 720, end: 780 }],
    };
    draft.days[4] = { open: true, start: 600, end: 960, breaks: [] };
    draft.daysOff = ["2026-12-26", "2026-12-25"];

    const { rules, refs } = draftToRules(draft);

    expect(rules).toEqual([
      {
        kind: "working",
        weekday: 0,
        start_time: "09:00:00",
        end_time: "17:00:00",
        off_date: null,
      },
      {
        kind: "break",
        weekday: 0,
        start_time: "12:00:00",
        end_time: "13:00:00",
        off_date: null,
      },
      {
        kind: "working",
        weekday: 4,
        start_time: "10:00:00",
        end_time: "16:00:00",
        off_date: null,
      },
      {
        kind: "day_off",
        weekday: null,
        start_time: null,
        end_time: null,
        off_date: "2026-12-25",
      },
      {
        kind: "day_off",
        weekday: null,
        start_time: null,
        end_time: null,
        off_date: "2026-12-26",
      },
    ]);
    expect(refs).toEqual([
      { kind: "hours", day: 0 },
      { kind: "break", day: 0, index: 0 },
      { kind: "hours", day: 4 },
      { kind: "dayoff", date: "2026-12-25" },
      { kind: "dayoff", date: "2026-12-26" },
    ]);
  });

  it("does not send breaks of a closed day", () => {
    const draft = emptyDraft();
    draft.days[1] = {
      open: false,
      start: 540,
      end: 1020,
      breaks: [{ start: 720, end: 780 }],
    };
    expect(draftToRules(draft).rules).toEqual([]);
  });

  it("round-trips what the server sent", () => {
    const original = [
      rule("working", 2, "08:15:00", "18:45:00"),
      rule("break", 2, "12:00:00", "12:30:00"),
      rule("day_off", null, null, null, "2027-01-01"),
    ];
    const { rules } = draftToRules(rulesToDraft(original).draft);
    expect(plain(rules)).toEqual(plain(original));
  });
});

describe("copy helpers", () => {
  it("copies one day's hours and breaks to the chosen days only", () => {
    const draft = emptyDraft();
    draft.days[0] = {
      open: true,
      start: 540,
      end: 1020,
      breaks: [{ start: 720, end: 780 }],
    };
    const next = copyDayHours(draft, 0, [1, 2]);
    expect(next.days[1]).toEqual(draft.days[0]);
    expect(next.days[2]).toEqual(draft.days[0]);
    expect(next.days[3]?.open).toBe(false);
    // A real copy: editing one day's break does not change the other.
    next.days[1]!.breaks[0]!.start = 700;
    expect(next.days[0]?.breaks[0]?.start).toBe(720);
    expect(next.days[2]?.breaks[0]?.start).toBe(720);
    // The input was not changed.
    expect(draft.days[1]?.open).toBe(false);
  });

  it("copies a whole schedule to another stylist, keeping their days off unless asked", () => {
    const source = emptyDraft();
    source.days[0] = { open: true, start: 540, end: 1020, breaks: [] };
    source.daysOff = ["2027-01-01"];
    const target = emptyDraft();
    target.daysOff = ["2027-02-02"];

    expect(copyDraft(source, target, false).daysOff).toEqual(["2027-02-02"]);
    expect(copyDraft(source, target, true).daysOff).toEqual(["2027-01-01"]);
    expect(copyDraft(source, target, false).days[0]?.open).toBe(true);
  });
});
