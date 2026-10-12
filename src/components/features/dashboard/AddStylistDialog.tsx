"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/features/auth/FormField";
import { NoServicesNotice } from "@/components/features/dashboard/NoServicesNotice";
import { ServiceCheckboxList } from "@/components/features/dashboard/ServiceCheckboxList";
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
  createStylist,
  setStylistServices,
  type CreatedStylist,
  type FieldErrors,
  type Service,
} from "@/lib/api";
import {
  describeAssignError,
  describeStylistCreateError,
} from "@/lib/stylist/save-error";
import {
  EMPTY_STYLIST_VALUES,
  toStylistPayload,
  validateStylist,
  type StylistFormValues,
} from "@/lib/stylist/validate";

type AddStylistDialogProps = {
  salonId: string;
  services: Service[];
  open: boolean;
  onClose: () => void;
  /**
   * The stylist now exists in the API (even if saving their services failed),
   * so the section should re-read its lists.
   */
  onCreated: () => void;
  /** Everything worked (the section closes the dialog and says so). */
  onDone: (message: string) => void;
};

type FormProps = Omit<AddStylistDialogProps, "open"> & {
  busyRef: { current: boolean };
};

function AddStylistForm({
  salonId,
  services,
  onClose,
  onCreated,
  onDone,
  busyRef,
}: FormProps) {
  const [values, setValues] = useState<StylistFormValues>(EMPTY_STYLIST_VALUES);
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  // Set once the stylist exists: from then on only the services can be retried.
  const [created, setCreated] = useState<CreatedStylist | null>(null);
  const waking = useSlowPending(pending);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  // A form-level message can sit out of view in a scrolling dialog: bring it into view and read it.
  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  // Move focus to the first invalid field so keyboard and screen-reader users land on the problem.
  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errors]);

  async function saveServices(stylist: CreatedStylist) {
    try {
      await setStylistServices(stylist.id, selected);
    } catch (error) {
      const failure = describeAssignError(error);
      // The stylist exists even though the services failed: show them in the list.
      onCreated();
      setFormError(
        `${stylist.name} was added, but their services were not saved. ${failure.message} You can try saving the services again, or close this and assign them later.`,
      );
      if (failure.signedOut) setLocked(true);
      busyRef.current = failure.signedOut;
      setPending(false);
      return;
    }
    busyRef.current = false;
    setPending(false);
    onDone(`${stylist.name} was added.`);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The ref closes the gap before React re-renders, so two quick taps send one request.
    if (busyRef.current) return;
    setFormError(null);

    if (created) {
      busyRef.current = true;
      setPending(true);
      await saveServices(created);
      return;
    }

    const found = validateStylist(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    busyRef.current = true;
    setPending(true);
    let stylist: CreatedStylist;
    try {
      stylist = await createStylist(toStylistPayload(salonId, values));
    } catch (error) {
      const failure = describeStylistCreateError(error);
      setErrors(failure.fields);
      setFormError(failure.message);
      // After a timeout the stylist may exist: show the list as it really is.
      if (failure.uncertain) onCreated();
      // On a 401 apiFetch is already going to /login: stay disabled.
      if (failure.signedOut) setLocked(true);
      busyRef.current = failure.signedOut;
      setPending(false);
      return;
    }

    setCreated(stylist);
    if (selected.length === 0) {
      busyRef.current = false;
      setPending(false);
      onDone(
        `${stylist.name} was added. Assign a service so clients can book them.`,
      );
      return;
    }
    await saveServices(stylist);
  }

  const disabled = pending || locked;
  const noServices = services.length === 0;
  const retrying = created !== null;

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
          ref={alertRef}
          tabIndex={-1}
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive outline-none"
        >
          {formError}
        </p>
      ) : null}
      {retrying ? (
        <p className="text-sm text-muted-foreground">
          Stylist:{" "}
          <span className="font-medium text-foreground">{created.name}</span>
        </p>
      ) : (
        <>
          <FormField
            id="stylist-name"
            label="Stylist name"
            autoComplete="off"
            value={values.name}
            disabled={disabled}
            onChange={(e) =>
              setValues((current) => ({ ...current, name: e.target.value }))
            }
            error={errors.name}
          />
          <FormField
            id="stylist-image"
            label="Photo link (optional)"
            type="url"
            required={false}
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://"
            hint="A link to a photo, starting with https://. Leave empty to show their initial."
            value={values.image_url}
            disabled={disabled}
            onChange={(e) =>
              setValues((current) => ({
                ...current,
                image_url: e.target.value,
              }))
            }
            error={errors.image_url}
          />
        </>
      )}
      {noServices ? (
        <NoServicesNotice />
      ) : (
        <ServiceCheckboxList
          idPrefix="add-stylist"
          legend="Services this stylist offers"
          services={services}
          selected={selected}
          onChange={setSelected}
          disabled={disabled}
        />
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={disabled}
          focusableWhenDisabled
        >
          {pending
            ? "Saving…"
            : retrying
              ? "Save services again"
              : "Add stylist"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={disabled}
          focusableWhenDisabled
          onClick={onClose}
        >
          {retrying ? "Close" : "Cancel"}
        </Button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-muted-foreground"
      >
        {waking
          ? "Waking up the server. This can take up to a minute, please wait."
          : ""}
      </p>
    </form>
  );
}

/**
 * Adds a stylist, then saves the services they offer. These are two API calls:
 * if the stylist is created but the services fail, the dialog says so and
 * offers to save the services again, without creating the stylist twice.
 */
export function AddStylistDialog({
  open,
  onClose,
  ...rest
}: AddStylistDialogProps) {
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
          <DialogTitle>Add a stylist</DialogTitle>
          <DialogDescription>
            Stylists do not sign in. You manage their services and hours here.
          </DialogDescription>
        </DialogHeader>
        <AddStylistForm {...rest} onClose={onClose} busyRef={busyRef} />
      </DialogContent>
    </Dialog>
  );
}
