"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/features/auth/FormField";
import { Button } from "@/components/ui/button";
import { useSlowPending } from "@/hooks/useSlowPending";
import {
  createSalon,
  updateSalon,
  type FieldErrors,
  type Salon,
} from "@/lib/api";
import { formatNaira, nairaToKobo } from "@/lib/money";
import { describeSaveError } from "@/lib/salon/save-error";
import {
  EMPTY_SALON_VALUES,
  changedFields,
  toSalonPayload,
  validateSalon,
  valuesFromSalon,
  type SalonFormValues,
} from "@/lib/salon/validate";

type SalonFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      salon: Salon;
      /** Called after a successful save (the dashboard closes the form). */
      onSaved?: () => void;
      onCancel?: () => void;
    };

const KOBO = new Intl.NumberFormat("en-NG");

/** One form for creating a salon and for editing it. */
export function SalonForm(props: SalonFormProps) {
  const router = useRouter();
  const editing = props.mode === "edit" ? props.salon : null;
  const [values, setValues] = useState<SalonFormValues>(
    editing ? valuesFromSalon(editing) : EMPTY_SALON_VALUES,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const waking = useSlowPending(pending);
  const formRef = useRef<HTMLFormElement>(null);
  // The ref closes the gap before React re-renders, so two quick taps send one request.
  const sending = useRef(false);

  // Move focus to the first invalid field so keyboard and screen-reader users land on the problem.
  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errors]);

  function set(field: keyof SalonFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    setFormError(null);
    setNotice(null);

    const found = validateSalon(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const changes = editing ? changedFields(editing, values) : null;
    if (editing && changes && Object.keys(changes).length === 0) {
      setNotice("Nothing to save. You have not changed anything.");
      return;
    }

    sending.current = true;
    setPending(true);
    try {
      if (editing && changes) {
        await updateSalon(editing.id, changes);
        setNotice("Saved.");
        sending.current = false;
        setPending(false);
        if (props.mode === "edit") props.onSaved?.();
      } else {
        await createSalon(toSalonPayload(values));
        // The page now shows the new salon; stay locked until it replaces this form.
        setLocked(true);
        setNotice("Salon created.");
        setPending(false);
      }
    } catch (error) {
      const failure = describeSaveError(error, editing ? "edit" : "create");
      setErrors(failure.fields);
      setFormError(failure.message);
      // On a 401 apiFetch is already going to /login: stay disabled.
      if (failure.signedOut) setLocked(true);
      sending.current = failure.signedOut;
      setPending(false);
      return;
    }
    // Outside the try: a failed refresh must not look like a failed save.
    try {
      router.refresh();
    } catch {
      // The salon is saved; the page updates on the next visit or reload.
    }
  }

  const kobo = nairaToKobo(values.deposit_amount);
  const depositHint =
    kobo !== null && errors.deposit_amount === undefined
      ? `${formatNaira(kobo)} is ${KOBO.format(kobo)} kobo. This is what customers pay now to book.`
      : "In naira, for example 5000. This is what customers pay now to book.";
  const disabled = pending || locked;
  const submitLabel = editing ? "Save changes" : "Create salon";

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
      className="flex flex-col gap-4"
    >
      {formError ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {formError}
        </p>
      ) : null}
      <FormField
        id="name"
        label="Salon name"
        autoComplete="organization"
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
        error={errors.name}
      />
      <FormField
        id="address"
        label="Address"
        autoComplete="street-address"
        value={values.address}
        onChange={(e) => set("address", e.target.value)}
        error={errors.address}
      />
      <FormField
        id="phone"
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={values.phone}
        onChange={(e) => set("phone", e.target.value)}
        error={errors.phone}
      />
      <FormField
        id="image_url"
        label="Photo link (optional)"
        type="url"
        required={false}
        autoCapitalize="none"
        spellCheck={false}
        placeholder="https://"
        hint="A link to a photo, starting with https://. Leave empty to show a pink tile."
        value={values.image_url}
        onChange={(e) => set("image_url", e.target.value)}
        error={errors.image_url}
      />
      <FormField
        id="cancellation_hours"
        label="Free cancellation window (hours)"
        inputMode="numeric"
        hint="Customers get their deposit back only if they cancel more than this many hours before the appointment."
        value={values.cancellation_hours}
        onChange={(e) => set("cancellation_hours", e.target.value)}
        error={errors.cancellation_hours}
      />
      <FormField
        id="deposit_amount"
        label="Deposit (₦)"
        inputMode="decimal"
        hint={depositHint}
        value={values.deposit_amount}
        onChange={(e) => set("deposit_amount", e.target.value)}
        error={errors.deposit_amount}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={disabled}>
          {pending ? (editing ? "Saving…" : "Creating…") : submitLabel}
        </Button>
        {props.mode === "edit" && props.onCancel ? (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={disabled}
            onClick={props.onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-muted-foreground"
      >
        {waking
          ? "Waking up the server. This can take up to a minute, please wait."
          : (notice ?? "")}
      </p>
    </form>
  );
}
