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
import { updateStylist, type FieldErrors, type Stylist } from "@/lib/api";
import { describeStylistUpdateError } from "@/lib/stylist/save-error";
import {
  changedStylistFields,
  validateStylist,
  valuesFromStylist,
  type StylistFormValues,
} from "@/lib/stylist/validate";

type EditStylistDialogProps = {
  /** The stylist to edit; null keeps the dialog closed. */
  stylist: Stylist | null;
  onClose: () => void;
  /** The API accepted the change (the section refreshes and closes). */
  onSaved: (message: string) => void;
  /** The API answered 404: the stylist is gone (the section refreshes and closes). */
  onGone: (message: string) => void;
  /** Where focus goes when the dialog closes (see Base UI's `finalFocus`). */
  finalFocus?: () => boolean | HTMLElement | null;
};

type FormProps = Pick<
  EditStylistDialogProps,
  "onClose" | "onSaved" | "onGone"
> & {
  stylist: Stylist;
  busyRef: { current: boolean };
};

function EditStylistForm({
  stylist,
  onClose,
  onSaved,
  onGone,
  busyRef,
}: FormProps) {
  const [values, setValues] = useState<StylistFormValues>(() =>
    valuesFromStylist(stylist),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The ref closes the gap before React re-renders, so two quick taps send one request.
    if (busyRef.current) return;
    setFormError(null);
    setNotice(null);

    const found = validateStylist(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const changes = changedStylistFields(stylist, values);
    if (Object.keys(changes).length === 0) {
      setNotice("Nothing to save. You have not changed anything.");
      return;
    }

    busyRef.current = true;
    setPending(true);
    let name: string;
    try {
      name = (await updateStylist(stylist.id, changes)).name;
    } catch (error) {
      const failure = describeStylistUpdateError(error);
      busyRef.current = failure.signedOut;
      setPending(false);
      if (failure.gone && failure.message) {
        onGone(failure.message);
        return;
      }
      setErrors(failure.fields);
      setFormError(failure.message);
      // On a 401 apiFetch is already going to /login: stay disabled.
      if (failure.signedOut) setLocked(true);
      return;
    }
    busyRef.current = false;
    setPending(false);
    onSaved(`${name} was saved.`);
  }

  const disabled = pending || locked;

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
      <FormField
        id="edit-stylist-name"
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
        id="edit-stylist-image"
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
          setValues((current) => ({ ...current, image_url: e.target.value }))
        }
        error={errors.image_url}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={disabled}
          focusableWhenDisabled
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={disabled}
          focusableWhenDisabled
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

/** Edits a stylist's name and photo link. It cannot be dismissed while a request is on its way. */
export function EditStylistDialog({
  stylist,
  onClose,
  finalFocus,
  ...rest
}: EditStylistDialogProps) {
  const busyRef = useRef(false);
  return (
    <Dialog
      open={stylist !== null}
      onOpenChange={(next) => {
        if (!next && !busyRef.current) onClose();
      }}
    >
      {stylist ? (
        <DialogContent finalFocus={finalFocus}>
          <DialogHeader>
            <DialogTitle className="break-words">
              Edit {stylist.name}
            </DialogTitle>
            <DialogDescription>
              Change the name and photo customers see when they book.
            </DialogDescription>
          </DialogHeader>
          <EditStylistForm
            key={stylist.id}
            stylist={stylist}
            onClose={onClose}
            busyRef={busyRef}
            {...rest}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
