import type { FieldErrors, Service } from "@/lib/api";
import type { components } from "@/lib/api-types";
import {
  MAX_PRICE_KOBO,
  formatNaira,
  koboToNairaInput,
  nairaToKobo,
} from "@/lib/money";

export type ServiceCreateInput = components["schemas"]["ServiceCreate"];
export type ServiceUpdateInput = components["schemas"]["ServiceUpdate"];
export type PriceType = components["schemas"]["PriceType"];

/** The API's limits for a service (openapi, checked against the live API). */
export const SERVICE_LIMITS = {
  nameMax: 100,
  durationMin: 1,
  durationMax: 1440,
} as const;

/** What the form holds: every field is the text in its input. */
export type ServiceFormValues = {
  name: string;
  duration_minutes: string;
  price_type: PriceType;
  /** In naira, as typed (the API stores kobo). Ignored for a quote. */
  price: string;
};

export const SERVICE_FIELDS = [
  "name",
  "duration_minutes",
  "price_type",
  "price",
] as const;

export const EMPTY_SERVICE_VALUES: ServiceFormValues = {
  name: "",
  duration_minutes: "",
  price_type: "fixed",
  price: "",
};

export const PRICE_RANGE_MESSAGE = `Enter a price from ₦1 to ${formatNaira(MAX_PRICE_KOBO)}, for example 5000 or 5,000.50.`;

const WHOLE_NUMBER = /^\d+$/;

/** Client-side checks, with the same limits as the API. Returns field -> message. */
export function validateService(values: ServiceFormValues): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Enter the service name.";
  else if (name.length > SERVICE_LIMITS.nameMax)
    errors.name = `Use at most ${SERVICE_LIMITS.nameMax} characters.`;

  const duration = values.duration_minutes.trim();
  if (
    !WHOLE_NUMBER.test(duration) ||
    Number(duration) < SERVICE_LIMITS.durationMin ||
    Number(duration) > SERVICE_LIMITS.durationMax
  ) {
    errors.duration_minutes = `Enter a whole number of minutes from ${SERVICE_LIMITS.durationMin} to ${SERVICE_LIMITS.durationMax}.`;
  }

  if (values.price_type === "fixed") {
    const kobo = nairaToKobo(values.price);
    if (kobo === null || kobo > MAX_PRICE_KOBO) {
      errors.price = PRICE_RANGE_MESSAGE;
    }
  }

  return errors;
}

/**
 * The body for creating a service, with the price converted from naira to
 * kobo here and nowhere else. Call only after `validateService` found nothing.
 * A quote sends no price (the API refuses one).
 */
export function toServicePayload(
  values: ServiceFormValues,
): ServiceCreateInput {
  const base = {
    name: values.name.trim(),
    duration_minutes: Number(values.duration_minutes.trim()),
    price_type: values.price_type,
  };
  if (values.price_type === "quote") return base;
  const kobo = nairaToKobo(values.price);
  if (kobo === null) throw new RangeError("Price is not a valid amount");
  return { ...base, price: kobo };
}

/** The form's starting values for a service that already exists. */
export function valuesFromService(service: Service): ServiceFormValues {
  return {
    name: service.name,
    duration_minutes: String(service.duration_minutes),
    price_type: service.price_type,
    price: service.price === null ? "" : koboToNairaInput(service.price),
  };
}

/**
 * The body for editing a service: only what changed. Checked against the live
 * API: the price is refused unless it fits the type, so going fixed -> quote
 * sends `price: null` along with the type, and quote -> fixed sends both the
 * type and the new price. Returns an empty object when nothing changed.
 */
export function changedServiceFields(
  service: Service,
  values: ServiceFormValues,
): ServiceUpdateInput {
  const next = toServicePayload(values);
  const changes: ServiceUpdateInput = {};
  if (next.name !== service.name) changes.name = next.name;
  if (next.duration_minutes !== service.duration_minutes) {
    changes.duration_minutes = next.duration_minutes;
  }
  const price = next.price ?? null;
  if (next.price_type !== service.price_type) {
    changes.price_type = next.price_type;
    changes.price = price;
  } else if (price !== service.price) {
    changes.price = price;
  }
  return changes;
}

/**
 * Puts the server's 422 field errors on the form. The price message is
 * replaced because the API talks in kobo. Anything for a field the form does
 * not show (the price type, or the price while a quote is chosen) goes to
 * `general`.
 */
export function serviceServerErrors(
  serverErrors: FieldErrors,
  /** False while a quote is chosen: the price field is hidden then. */
  priceVisible = true,
): {
  fields: FieldErrors;
  general: string | null;
} {
  const fields: FieldErrors = {};
  const other: string[] = [];
  for (const [field, message] of Object.entries(serverErrors)) {
    // A message for a field the person cannot see would hide the reason.
    if (field === "price_type" || (field === "price" && !priceVisible))
      other.push(message);
    else if (field === "price") fields.price = PRICE_RANGE_MESSAGE;
    else if ((SERVICE_FIELDS as readonly string[]).includes(field))
      fields[field] = message;
    else other.push(message);
  }
  return { fields, general: other.length > 0 ? other.join(" ") : null };
}
