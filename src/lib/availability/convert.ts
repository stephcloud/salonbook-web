import type { AvailabilityRule, AvailabilityRuleInput } from "@/lib/api";
import {
  isWholeMinuteApiTime,
  minutesToApiTime,
  parseApiTime,
} from "@/lib/time";
import { emptyDraft, WEEKDAY_NAMES, type Draft } from "./draft";

/** Which on-screen control a rule sent to the API came from, to put its error back there. */
export type RuleRef =
  | { kind: "hours"; day: number }
  | { kind: "break"; day: number; index: number }
  | { kind: "dayoff"; date: string };

export type ParsedRules = {
  draft: Draft;
  /**
   * Things stored on the server that this page cannot show. Saving replaces
   * them with what the page shows, so the owner is told first.
   */
  issues: string[];
};

type Block = { start: number; end: number };

function readBlock(rule: AvailabilityRule): Block | null {
  if (!rule.start_time || !rule.end_time) return null;
  if (
    !isWholeMinuteApiTime(rule.start_time) ||
    !isWholeMinuteApiTime(rule.end_time)
  ) {
    return null;
  }
  const start = parseApiTime(rule.start_time);
  const end = parseApiTime(rule.end_time);
  return start === null || end === null ? null : { start, end };
}

/** Turns the server's flat rule list into the 7-day draft, noting what it cannot show. */
export function rulesToDraft(rules: AvailabilityRule[]): ParsedRules {
  const draft = emptyDraft();
  const issues: string[] = [];
  const working: Block[][] = WEEKDAY_NAMES.map(() => []);
  const breaks: Block[][] = WEEKDAY_NAMES.map(() => []);

  for (const rule of rules) {
    if (rule.kind === "day_off") {
      if (rule.off_date && !draft.daysOff.includes(rule.off_date)) {
        draft.daysOff.push(rule.off_date);
      }
      continue;
    }
    const day = rule.weekday;
    if (day === null || day === undefined || !WEEKDAY_NAMES[day]) {
      issues.push("A rule with an unknown weekday was found.");
      continue;
    }
    const block = readBlock(rule);
    if (!block) {
      issues.push(
        `${WEEKDAY_NAMES[day]} has a time with seconds that this page cannot show.`,
      );
      continue;
    }
    (rule.kind === "working" ? working : breaks)[day]?.push(block);
  }

  WEEKDAY_NAMES.forEach((name, day) => {
    const blocks = [...(working[day] ?? [])].sort((a, b) => a.start - b.start);
    const first = blocks[0];
    const dayBreaks = [...(breaks[day] ?? [])].sort(
      (a, b) => a.start - b.start,
    );
    if (!first) {
      if (dayBreaks.length > 0) {
        issues.push(`${name} has a break but no working hours.`);
      }
      return;
    }
    if (blocks.length > 1) {
      issues.push(
        `${name} has ${blocks.length} separate blocks of hours. Only the first one is shown.`,
      );
    }
    draft.days[day] = { open: true, ...first, breaks: dayBreaks };
  });

  draft.daysOff.sort();
  return { draft, issues };
}

/**
 * The rules to send. This is the complete list: the API replaces everything,
 * so hours, breaks and days off always travel together. `refs[i]` says where
 * `rules[i]` came from. Breaks of a closed day are not sent.
 */
export function draftToRules(draft: Draft): {
  rules: AvailabilityRuleInput[];
  refs: RuleRef[];
} {
  const rules: AvailabilityRuleInput[] = [];
  const refs: RuleRef[] = [];

  draft.days.forEach((day, index) => {
    if (!day.open) return;
    rules.push({
      kind: "working",
      weekday: index,
      start_time: minutesToApiTime(day.start),
      end_time: minutesToApiTime(day.end),
      off_date: null,
    });
    refs.push({ kind: "hours", day: index });
    day.breaks.forEach((range, breakIndex) => {
      rules.push({
        kind: "break",
        weekday: index,
        start_time: minutesToApiTime(range.start),
        end_time: minutesToApiTime(range.end),
        off_date: null,
      });
      refs.push({ kind: "break", day: index, index: breakIndex });
    });
  });

  for (const date of [...draft.daysOff].sort()) {
    rules.push({
      kind: "day_off",
      weekday: null,
      start_time: null,
      end_time: null,
      off_date: date,
    });
    refs.push({ kind: "dayoff", date });
  }

  return { rules, refs };
}
