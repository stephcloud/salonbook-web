import type { FieldErrors, Salon } from "@/lib/api";
import type { components } from "@/lib/api-types";
import {
  MAX_DEPOSIT_KOBO,
  formatNaira,
  koboToNairaInput,
  nairaToKobo,
} from "@/lib/money";

export type SalonCreateInput = components["schemas"]["SalonCreate"];
export type SalonUpdateInput = components["schemas"]["SalonUpdate"];

/** The API's limits for a salon (checked against the live API). */
export const SALON_LIMITS = {
  nameMax: 100,
  addressMax: 255,
  phoneMin: 3,
  phoneMax: 30,
  imageMax: 500,
  hoursMin: 0,
  hoursMax: 720,
} as const;

export const DEFAULT_CANCELLATION_HOURS = 24;

/** What the form holds: every field is the text in its input. */
export type SalonFormValues = {
  name: string;
  address: string;
  phone: string;
  image_url: string;
  cancellation_hours: string;
  /** In naira, as typed (the API stores kobo). */
  deposit_amount: string;
};

/** The form's fields use the API's own names, so a 422 lands on the right field. */
export const SALON_FIELDS = [
  "name",
  "address",
  "phone",
  "image_url",
  "cancellation_hours",
  "deposit_amount",
] as const;

export const EMPTY_SALON_VALUES: SalonFormValues = {
  name: "",
  address: "",
  phone: "",
  image_url: "",
  cancellation_hours: String(DEFAULT_CANCELLATION_HOURS),
  deposit_amount: "",
};

const HTTPS_URL = /^https:\/\/\S+$/;
const WHOLE_NUMBER = /^\d+$/;

export const DEPOSIT_RANGE_MESSAGE = `Enter an amount from ₦1 to ${formatNaira(MAX_DEPOSIT_KOBO)}, for example 5000 or 5,000.50.`;

/** Client-side checks, with the same limits as the API. Returns field -> message. */
export function validateSalon(values: SalonFormValues): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Enter the salon name.";
  else if (name.length > SALON_LIMITS.nameMax)
    errors.name = `Use at most ${SALON_LIMITS.nameMax} characters.`;

  const address = values.address.trim();
  if (!address) errors.address = "Enter the salon address.";
  else if (address.length > SALON_LIMITS.addressMax)
    errors.address = `Use at most ${SALON_LIMITS.addressMax} characters.`;

  const phone = values.phone.trim();
  if (!phone) errors.phone = "Enter a phone number.";
  else if (phone.length < SALON_LIMITS.phoneMin)
    errors.phone = `Use at least ${SALON_LIMITS.phoneMin} characters.`;
  else if (phone.length > SALON_LIMITS.phoneMax)
    errors.phone = `Use at most ${SALON_LIMITS.phoneMax} characters.`;

  const image = values.image_url.trim();
  if (image) {
    if (!HTTPS_URL.test(image))
      errors.image_url = "Start with https:// and leave out spaces.";
    else if (image.length > SALON_LIMITS.imageMax)
      errors.image_url = `Use at most ${SALON_LIMITS.imageMax} characters.`;
  }

  const hours = values.cancellation_hours.trim();
  if (!WHOLE_NUMBER.test(hours)) {
    errors.cancellation_hours = "Enter a whole number of hours.";
  } else if (
    Number(hours) < SALON_LIMITS.hoursMin ||
    Number(hours) > SALON_LIMITS.hoursMax
  ) {
    errors.cancellation_hours = `Use a number from ${SALON_LIMITS.hoursMin} to ${SALON_LIMITS.hoursMax}.`;
  }

  const kobo = nairaToKobo(values.deposit_amount);
  if (kobo === null || kobo > MAX_DEPOSIT_KOBO) {
    errors.deposit_amount = DEPOSIT_RANGE_MESSAGE;
  }

  return errors;
}

/** The body for creating a salon. Call only after `validateSalon` found nothing. */
export function toSalonPayload(values: SalonFormValues): SalonCreateInput {
  const kobo = nairaToKobo(values.deposit_amount);
  if (kobo === null) throw new RangeError("Deposit is not a valid amount");
  const image = values.image_url.trim();
  return {
    name: values.name.trim(),
    address: values.address.trim(),
    phone: values.phone.trim(),
    ...(image ? { image_url: image } : {}),
    cancellation_hours: Number(values.cancellation_hours.trim()),
    deposit_amount: kobo,
  };
}

/** The form's starting values for a salon that already exists. */
export function valuesFromSalon(salon: Salon): SalonFormValues {
  return {
    name: salon.name,
    address: salon.address,
    phone: salon.phone,
    image_url: salon.image_url ?? "",
    cancellation_hours: String(salon.cancellation_hours),
    deposit_amount: koboToNairaInput(salon.deposit_amount),
  };
}

/**
 * The body for editing a salon: only what changed. Checked against the live
 * API: an explicit `image_url: null` clears the image, while null (or a missing
 * value) for any other field changes nothing, so those are simply left out.
 * Returns an empty object when nothing changed.
 */
export function changedFields(
  salon: Salon,
  values: SalonFormValues,
): SalonUpdateInput {
  const next = toSalonPayload(values);
  const changes: SalonUpdateInput = {};
  if (next.name !== salon.name) changes.name = next.name;
  if (next.address !== salon.address) changes.address = next.address;
  if (next.phone !== salon.phone) changes.phone = next.phone;
  if (next.cancellation_hours !== salon.cancellation_hours) {
    changes.cancellation_hours = next.cancellation_hours;
  }
  if (next.deposit_amount !== salon.deposit_amount) {
    changes.deposit_amount = next.deposit_amount;
  }
  const image = next.image_url ?? null;
  if (image !== (salon.image_url ?? null)) changes.image_url = image;
  return changes;
}

/**
 * Puts the server's 422 field errors on the form. The API names the field by
 * its own name; the deposit message is replaced because the API talks in kobo
 * ("less than or equal to 100000000") while the form is in naira. Anything for
 * a field the form does not have goes to `general`.
 */
export function salonServerErrors(serverErrors: FieldErrors): {
  fields: FieldErrors;
  general: string | null;
} {
  const fields: FieldErrors = {};
  const other: string[] = [];
  for (const [field, message] of Object.entries(serverErrors)) {
    if (field === "deposit_amount")
      fields.deposit_amount = DEPOSIT_RANGE_MESSAGE;
    else if ((SALON_FIELDS as readonly string[]).includes(field))
      fields[field] = message;
    else other.push(message);
  }
  return { fields, general: other.length > 0 ? other.join(" ") : null };
}
