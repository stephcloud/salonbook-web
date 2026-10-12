import { describe, expect, it } from "vitest";
import { emptyDraft, type DayDraft } from "./draft";
import { validateDay, validateDayOff, validateDraft } from "./validate";

const day = (over: Partial<DayDraft> = {}): DayDraft => ({
  open: true,
  start: 540,
  end: 1020,
  breaks: [],
  ...over,
});

describe("validateDay", () => {
  it("accepts ordinary hours", () => {
    expect(validateDay(day())).toEqual({ hours: null, breaks: [] });
  });

  it("needs the end after the start", () => {
    expect(validateDay(day({ end: 540 })).hours).toMatch(/after the start/);
    expect(validateDay(day({ end: 500 })).hours).toMatch(/after the start/);
  });

  it("ignores a closed day, even with a bad break", () => {
    const closed = day({
      open: false,
      end: 100,
      breaks: [{ start: 50, end: 20 }],
    });
    expect(validateDay(closed)).toEqual({ hours: null, breaks: [null] });
  });

  it("needs a break to end after it starts", () => {
    const result = validateDay(day({ breaks: [{ start: 780, end: 720 }] }));
    expect(result.breaks[0]).toMatch(/end after it starts/);
  });

  it("keeps a break inside the hours, and says the hours", () => {
    const early = validateDay(day({ breaks: [{ start: 480, end: 600 }] }));
    const late = validateDay(day({ breaks: [{ start: 1000, end: 1080 }] }));
    expect(early.breaks[0]).toBe(
      "The break must be inside the working hours (9:00 AM to 5:00 PM).",
    );
    expect(late.breaks[0]).toMatch(/inside the working hours/);
  });

  it("allows a break exactly at the edges", () => {
    expect(
      validateDay(day({ breaks: [{ start: 540, end: 1020 }] })).breaks,
    ).toEqual([null]);
  });

  it("flags the later of two overlapping breaks, whatever their order", () => {
    const result = validateDay(
      day({
        breaks: [
          { start: 750, end: 810 },
          { start: 720, end: 780 },
        ],
      }),
    );
    expect(result.breaks).toEqual(["This break overlaps another break.", null]);
  });

  it("lets breaks touch", () => {
    const result = validateDay(
      day({
        breaks: [
          { start: 720, end: 780 },
          { start: 780, end: 840 },
        ],
      }),
    );
    expect(result.breaks).toEqual([null, null]);
  });
});

describe("validateDraft", () => {
  it("is ok for an empty week", () => {
    expect(validateDraft(emptyDraft()).ok).toBe(true);
  });

  it("is not ok when any day is wrong", () => {
    const draft = emptyDraft();
    draft.days[3] = day({ end: 500 });
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    expect(result.days[3]?.hours).not.toBeNull();
  });

  it("refuses more than 200 entries", () => {
    const draft = emptyDraft();
    draft.daysOff = Array.from({ length: 201 }, (_, i) => `day-${i}`);
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    expect(result.general).toMatch(/too many/);
  });
});

describe("validateDayOff", () => {
  const today = "2026-10-12";

  it("accepts today and later days", () => {
    expect(validateDayOff("2026-10-12", [], today)).toBeNull();
    expect(validateDayOff("2027-01-01", [], today)).toBeNull();
  });

  it("refuses a past day", () => {
    expect(validateDayOff("2026-10-11", [], today)).toMatch(/Past days/);
  });

  it("refuses an empty or impossible date", () => {
    expect(validateDayOff("", [], today)).toBe("Choose a date.");
    expect(validateDayOff("2026-02-30", [], today)).toMatch(/real date/);
    expect(validateDayOff("12/10/2026", [], today)).toMatch(/real date/);
  });

  it("refuses a day that is already off", () => {
    expect(validateDayOff("2026-12-25", ["2026-12-25"], today)).toMatch(
      /already/,
    );
  });
});
