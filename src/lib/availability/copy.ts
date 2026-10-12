import { getAvailability, setAvailability, type Availability } from "@/lib/api";
import { draftToRules, rulesToDraft } from "./convert";
import type { DayDraft } from "./draft";

/**
 * Gives another stylist the same weekly hours. The API replaces a stylist's
 * rules as one list, so the target's days off are read first and sent back
 * unchanged, unless `daysOff` is given (then those replace them).
 */
export async function copyHoursToStylist(input: {
  targetId: string;
  days: DayDraft[];
  /** Replace the target's days off with these; leave undefined to keep theirs. */
  daysOff?: string[];
}): Promise<Availability> {
  const daysOff =
    input.daysOff ??
    rulesToDraft((await getAvailability(input.targetId)).rules).draft.daysOff;
  const { rules } = draftToRules({ days: input.days, daysOff });
  return setAvailability(input.targetId, rules);
}
