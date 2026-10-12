"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/features/auth/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSlowPending } from "@/hooks/useSlowPending";
import {
  createService,
  updateService,
  type FieldErrors,
  type Service,
} from "@/lib/api";
import { describeServiceSaveError } from "@/lib/service/save-error";
import {
  EMPTY_SERVICE_VALUES,
  changedServiceFields,
  toServicePayload,
  validateService,
  valuesFromService,
  type PriceType,
  type ServiceFormValues,
} from "@/lib/service/validate";
import { cn } from "@/lib/utils";

const PRICE_CHOICES: { value: PriceType; label: string; hint: string }[] = [
  { value: "fixed", label: "Fixed price", hint: "You set the price now." },
  {
    value: "quote",
    label: "Price confirmed in person",
    hint: 'Customers see "Price on consultation".',
  },
];

type ServiceFormDialogProps = {
  salonId: string;
  /** Add a service when null, edit that service otherwise. */
  service: Service | null;
  open: boolean;
  onClose: () => void;
  /** Called after the API accepted the change (the section refreshes and closes). */
  onSaved: (message: string) => void;
};

type FormProps = Omit<ServiceFormDialogProps, "open"> & {
  busyRef: { current: boolean };
};

function ServiceForm({
  salonId,
  service,
  onClose,
  onSaved,
  busyRef,
}: FormProps) {
  const [values, setValues] = useState<ServiceFormValues>(
    service ? valuesFromService(service) : EMPTY_SERVICE_VALUES,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const waking = useSlowPending(pending);
  const formRef = useRef<HTMLFormElement>(null);

  // Move focus to the first invalid field so keyboard and screen-reader users land on the problem.
  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errors]);

  function set<K extends keyof ServiceFormValues>(
    field: K,
    value: ServiceFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The ref closes the gap before React re-renders, so two quick taps send one request.
    if (busyRef.current) return;
    setFormError(null);
    setNotice(null);

    const found = validateService(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const changes = service ? changedServiceFields(service, values) : null;
    if (service && changes && Object.keys(changes).length === 0) {
      setNotice("Nothing to save. You have not changed anything.");
      return;
    }

    busyRef.current = true;
    setPending(true);
    try {
      if (service && changes) {
        await updateService(service.id, changes);
      } else {
        await createService(salonId, toServicePayload(values));
      }
    } catch (error) {
      const failure = describeServiceSaveError(error);
      setErrors(failure.fields);
      setFormError(failure.message);
      // On a 401 apiFetch is already going to /login: stay disabled.
      if (failure.signedOut) setLocked(true);
      busyRef.current = failure.signedOut;
      setPending(false);
      return;
    }
    busyRef.current = false;
    setPending(false);
    onSaved(service ? "Service saved." : "Service added.");
  }

  const disabled = pending || locked;
  const quote = values.price_type === "quote";

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
        id="service-name"
        label="Service name"
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
        error={errors.name}
      />
      <FormField
        id="service-duration"
        label="Duration (minutes)"
        inputMode="numeric"
        hint="How long it takes, for example 90."
        value={values.duration_minutes}
        onChange={(e) => set("duration_minutes", e.target.value)}
        error={errors.duration_minutes}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Price</legend>
        {PRICE_CHOICES.map((choice) => (
          <label
            key={choice.value}
            className={cn(
              "flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ring-border has-focus-visible:ring-3 has-focus-visible:ring-ring",
              values.price_type === choice.value && "bg-secondary ring-primary",
            )}
          >
            <input
              type="radio"
              name="price_type"
              value={choice.value}
              checked={values.price_type === choice.value}
              disabled={disabled}
              onChange={() => set("price_type", choice.value)}
              className="mt-1 size-4 accent-primary"
            />
            <span className="flex flex-col">
              <span className="font-medium">{choice.label}</span>
              <span className="text-sm text-muted-foreground">
                {choice.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {quote ? null : (
        <FormField
          id="service-price"
          label="Price (₦)"
          inputMode="decimal"
          hint="In naira, for example 5000."
          value={values.price}
          onChange={(e) => set("price", e.target.value)}
          error={errors.price}
        />
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={disabled}>
          {pending ? "Saving…" : service ? "Save changes" : "Add service"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={disabled}
          onClick={onClose}
        >
          Cancel
        </Button>
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

/** Add or edit a service in a dialog. It cannot be dismissed while a request is on its way. */
export function ServiceFormDialog({
  open,
  onClose,
  ...rest
}: ServiceFormDialogProps) {
  const busyRef = useRef(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busyRef.current) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {rest.service ? "Edit service" : "Add a service"}
          </DialogTitle>
          <DialogDescription>
            {rest.service
              ? "Change what customers see when they book."
              : "Add what you offer, with how long it takes and what it costs."}
          </DialogDescription>
        </DialogHeader>
        <ServiceForm
          key={rest.service?.id ?? "new"}
          {...rest}
          onClose={onClose}
          busyRef={busyRef}
        />
      </DialogContent>
    </Dialog>
  );
}
