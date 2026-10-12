"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CopyDayDialog } from "@/components/features/dashboard/availability/CopyDayDialog";
import { CopyToStylistDialog } from "@/components/features/dashboard/availability/CopyToStylistDialog";
import { DayHoursCard } from "@/components/features/dashboard/availability/DayHoursCard";
import { DaysOffSection } from "@/components/features/dashboard/availability/DaysOffSection";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNotice } from "@/hooks/useNotice";
import { useSlowPending } from "@/hooks/useSlowPending";
import { availabilityKey } from "@/hooks/useStylistAvailability";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { setAvailability, type Availability, type Stylist } from "@/lib/api";
import { draftToRules, rulesToDraft } from "@/lib/availability/convert";
import {
  copyDayHours,
  WEEKDAY_NAMES,
  type DayDraft,
  type Draft,
} from "@/lib/availability/draft";
import {
  breakKey,
  describeAvailabilitySaveError,
  type AvailabilitySaveFailure,
} from "@/lib/availability/save-error";
import { validateDraft } from "@/lib/availability/validate";

type HoursFormProps = {
  stylist: Pick<Stylist, "id" | "name">;
  /** The other stylists in the salon, for "Copy to another stylist". */
  others: Stylist[];
  availability: Availability;
  /** Tells the page whether there are changes that are not saved. */
  onDirtyChange: (dirty: boolean) => void;
};

const WAKING =
  "Waking up the server. This can take up to a minute, please wait.";

type SaveOptions = {
  /** Check the hours on screen first (not needed when only days off change). */
  checkHours: boolean;
  success: string;
  /** Keep the hours being edited, and replace them only with the saved ones. */
  keepEdits: boolean;
};

/**
 * Edits one stylist's week. The API replaces all of a stylist's rules in one
 * call, so hours, breaks and days off always travel together: saving hours
 * sends the saved days off, and adding or removing a day off sends the saved
 * hours (never half-edited ones).
 */
export function HoursForm({
  stylist,
  others,
  availability,
  onDirtyChange,
}: HoursFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const parsed = useMemo(
    () => rulesToDraft(availability.rules),
    [availability.rules],
  );
  const saved = parsed.draft;
  const [days, setDays] = useState<DayDraft[]>(saved.days);
  const [failure, setFailure] = useState<AvailabilitySaveFailure | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const [copyingToStylist, setCopyingToStylist] = useState(false);
  const [notice, showNotice] = useNotice();
  const waking = useSlowPending(pending);
  const busyRef = useRef(false);
  const alertRef = useRef<HTMLParagraphElement>(null);

  const dirty = JSON.stringify(days) !== JSON.stringify(saved.days);
  useUnsavedChangesWarning(dirty);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    if (pageMessage) alertRef.current?.focus();
  }, [pageMessage]);

  const validation = useMemo(
    () => validateDraft({ days, daysOff: saved.daysOff }),
    [days, saved.daysOff],
  );
  const blocked = parsed.issues.length > 0 && !acknowledged;
  const disabled = pending || locked;

  function edit(next: DayDraft[]) {
    setDays(next);
    setFailure(null);
    setPageMessage(null);
  }

  /** Sends the full rule list for `payload`; true when the server accepted it. */
  async function persist(
    payload: Draft,
    { checkHours, success, keepEdits }: SaveOptions,
  ): Promise<boolean> {
    if (busyRef.current) return false;
    setFailure(null);
    setPageMessage(null);

    const checked = validateDraft(payload);
    if (checkHours && !checked.ok) {
      setPageMessage(
        checked.general ?? "Fix the times marked in red, then save again.",
      );
      return false;
    }
    if (!checkHours && checked.general) {
      setPageMessage(checked.general);
      return false;
    }

    busyRef.current = true;
    setPending(true);
    const { rules, refs } = draftToRules(payload);
    let result: Availability;
    try {
      result = await setAvailability(stylist.id, rules);
    } catch (error) {
      const problem = describeAvailabilitySaveError(error, refs);
      setFailure(problem);
      setPageMessage(problem.message);
      if (problem.signedOut) setLocked(true);
      busyRef.current = problem.signedOut;
      setPending(false);
      return false;
    }
    busyRef.current = false;
    setPending(false);
    queryClient.setQueryData(availabilityKey(stylist.id), result);
    if (!keepEdits) setDays(rulesToDraft(result.rules).draft.days);
    setAcknowledged(false);
    showNotice(success);
    // The dashboard checklist reads these hours: ask the server to render again.
    router.refresh();
    return true;
  }

  const saveHours = () =>
    persist(
      { days, daysOff: saved.daysOff },
      {
        checkHours: true,
        success: `Hours saved for ${stylist.name}.`,
        keepEdits: false,
      },
    );

  const changeDaysOff = (daysOff: string[], success: string) =>
    persist(
      { days: saved.days, daysOff },
      { checkHours: false, success, keepEdits: true },
    );

  return (
    <div className="flex flex-col gap-6">
      {/* Always mounted so a new message is announced. */}
      <p
        role="status"
        aria-live="polite"
        className={notice ? "text-sm font-medium text-green-900" : "sr-only"}
      >
        {notice}
      </p>

      {parsed.issues.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-amber-100 p-4 text-amber-900">
          <p className="font-semibold">
            Some saved hours cannot be shown on this page
          </p>
          <ul className="list-disc pl-5 text-sm">
            {parsed.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring">
            <Checkbox
              checked={acknowledged}
              disabled={disabled}
              onCheckedChange={setAcknowledged}
            />
            Replace them with what is shown here when I save
          </label>
        </div>
      ) : null}

      {pageMessage ? (
        <p
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive outline-none"
        >
          {pageMessage}
        </p>
      ) : null}

      <section aria-labelledby="hours-heading" className="flex flex-col gap-4">
        <h2 id="hours-heading" className="text-xl font-bold">
          Weekly hours
        </h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {WEEKDAY_NAMES.map((name, index) => {
            const day = days[index];
            if (!day) return null;
            const errors = validation.days[index];
            return (
              <DayHoursCard
                key={name}
                name={name}
                idPrefix={`day-${index}`}
                day={day}
                hoursError={errors?.hours ?? failure?.days[index] ?? null}
                breakErrors={day.breaks.map(
                  (_, breakIndex) =>
                    errors?.breaks[breakIndex] ??
                    failure?.breaks[breakKey(index, breakIndex)] ??
                    null,
                )}
                disabled={disabled}
                onChange={(next) =>
                  edit(days.map((d, i) => (i === index ? next : d)))
                }
                onCopy={() => setCopyFrom(index)}
              />
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="lg"
            disabled={disabled || blocked}
            focusableWhenDisabled
            onClick={() => void saveHours()}
          >
            {pending ? "Saving…" : "Save hours"}
          </Button>
          {others.length > 0 ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={disabled}
              focusableWhenDisabled
              onClick={() => {
                if (!validation.ok) {
                  setPageMessage(
                    "Fix the times marked in red before copying these hours.",
                  );
                  return;
                }
                setPageMessage(null);
                setCopyingToStylist(true);
              }}
            >
              Copy to another stylist
            </Button>
          ) : null}
          {dirty ? (
            <p className="text-sm font-medium text-amber-900">
              You have unsaved changes.
            </p>
          ) : null}
        </div>
        <p
          role="status"
          aria-live="polite"
          className="min-h-5 text-sm text-muted-foreground"
        >
          {waking ? WAKING : ""}
        </p>
      </section>

      <DaysOffSection
        daysOff={saved.daysOff}
        disabled={disabled || blocked}
        serverError={failure?.daysOff ?? null}
        onAdd={(date) =>
          changeDaysOff([...saved.daysOff, date], "Day off added.")
        }
        onRemove={(date) =>
          void changeDaysOff(
            saved.daysOff.filter((value) => value !== date),
            "Day off removed.",
          )
        }
      />

      <CopyDayDialog
        source={copyFrom}
        onClose={() => setCopyFrom(null)}
        onCopy={(source, targets) => {
          edit(
            copyDayHours({ days, daysOff: saved.daysOff }, source, targets)
              .days,
          );
          setCopyFrom(null);
          showNotice(
            `Copied ${WEEKDAY_NAMES[source]}'s hours. Press Save hours to keep them.`,
          );
        }}
      />
      <CopyToStylistDialog
        open={copyingToStylist}
        sourceName={stylist.name}
        others={others}
        days={days}
        daysOff={saved.daysOff}
        onClose={() => setCopyingToStylist(false)}
        onCopied={(message) => {
          setCopyingToStylist(false);
          showNotice(message);
          router.refresh();
        }}
      />
    </div>
  );
}
