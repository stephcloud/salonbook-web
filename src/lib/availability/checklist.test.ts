import { describe, expect, it } from "vitest";
import type { Salon, Service, Stylist } from "@/lib/api";
import { buildChecklist } from "@/lib/setup-checklist";
import { draftToRules } from "./convert";
import { emptyDraft } from "./draft";

const SALON = { id: "salon-1", name: "Pink Studio" } as Salon;
const SERVICE = { id: "service-1" } as Service;
const STYLIST = { id: "stylist-1", name: "Ada" } as Stylist;

/** What the dashboard sees after a save: the rules this page sent, as the API answers. */
function checklistAfterSaving(draft = emptyDraft()) {
  const { rules } = draftToRules(draft);
  return buildChecklist({
    salon: SALON,
    services: [SERVICE],
    stylists: [STYLIST],
    availability: {
      read: [
        {
          stylist_id: STYLIST.id,
          rules: rules.map((r, i) => ({
            id: `rule-${i}`,
            kind: r.kind,
            weekday: r.weekday ?? null,
            start_time: r.start_time ?? null,
            end_time: r.end_time ?? null,
            off_date: r.off_date ?? null,
          })),
        },
      ],
      unchecked: 0,
    },
  });
}

const hoursStep = (checklist: ReturnType<typeof buildChecklist>) =>
  checklist.steps.find((step) => step.id === "hours");

describe("the setup checklist after saving hours", () => {
  it("ticks 'set weekly hours' once one day is open", () => {
    const draft = emptyDraft();
    draft.days[2] = { open: true, start: 540, end: 1020, breaks: [] };
    const checklist = checklistAfterSaving(draft);
    expect(hoursStep(checklist)?.status).toBe("done");
    expect(checklist.readyForCustomers).toBe(true);
  });

  it("stays to do when every day is closed, even with days off saved", () => {
    const draft = emptyDraft();
    draft.daysOff = ["2099-01-01"];
    expect(hoursStep(checklistAfterSaving(draft))?.status).toBe("todo");
  });

  it("goes back to to do when the owner closes the last open day", () => {
    const open = emptyDraft();
    open.days[0] = { open: true, start: 540, end: 1020, breaks: [] };
    expect(hoursStep(checklistAfterSaving(open))?.status).toBe("done");

    const closed = emptyDraft();
    closed.days[0] = { open: false, start: 540, end: 1020, breaks: [] };
    expect(hoursStep(checklistAfterSaving(closed))?.status).toBe("todo");
  });
});
