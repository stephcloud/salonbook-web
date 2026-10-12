import type { FieldErrors } from "@/lib/api";

/** The API's limits for a stylist (openapi, checked against the live API). */
export const STYLIST_LIMITS = { nameMax: 100, imageMax: 500 } as const;

export type StylistFormValues = {
  name: string;
  image_url: string;
};

export const EMPTY_STYLIST_VALUES: StylistFormValues = {
  name: "",
  image_url: "",
};

export const STYLIST_FIELDS = ["name", "image_url"] as const;

const HTTPS_URL = /^https:\/\/\S+$/;

/** Client-side checks, with the same limits as the API. Returns field -> message. */
export function validateStylist(values: StylistFormValues): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Enter the stylist's name.";
  else if (name.length > STYLIST_LIMITS.nameMax)
    errors.name = `Use at most ${STYLIST_LIMITS.nameMax} characters.`;

  const image = values.image_url.trim();
  if (image) {
    if (!HTTPS_URL.test(image))
      errors.image_url = "Start with https:// and leave out spaces.";
    else if (image.length > STYLIST_LIMITS.imageMax)
      errors.image_url = `Use at most ${STYLIST_LIMITS.imageMax} characters.`;
  }

  return errors;
}

/** What the browser sends to our own route handler (never credentials). */
export type NewStylistInput = {
  salon_id: string;
  name: string;
  image_url?: string;
};

/** Call only after `validateStylist` found nothing. */
export function toStylistPayload(
  salonId: string,
  values: StylistFormValues,
): NewStylistInput {
  const image = values.image_url.trim();
  return {
    salon_id: salonId,
    name: values.name.trim(),
    ...(image ? { image_url: image } : {}),
  };
}

/** Puts the server's 422 field errors on the form; other fields go to `general`. */
export function stylistServerErrors(serverErrors: FieldErrors): {
  fields: FieldErrors;
  general: string | null;
} {
  const fields: FieldErrors = {};
  const other: string[] = [];
  for (const [field, message] of Object.entries(serverErrors)) {
    if ((STYLIST_FIELDS as readonly string[]).includes(field))
      fields[field] = message;
    else other.push(message);
  }
  return { fields, general: other.length > 0 ? other.join(" ") : null };
}
