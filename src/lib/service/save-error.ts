import { ApiError, type FieldErrors } from "@/lib/api";
import { serviceServerErrors } from "./validate";

export type ServiceSaveFailure = {
  /** Messages for the form's own fields (from a 422). */
  fields: FieldErrors;
  /** A message for the whole form, or null when the field messages say it all. */
  message: string | null;
  /** The API said the session is over; the browser is already going to /login. */
  signedOut: boolean;
};

const GENERIC = "Something went wrong on our side. Please try again.";
const OFFLINE =
  "Could not reach the server. Check your connection and try again.";

/** Turns whatever a failed add or edit threw into what the form shows. */
export function describeServiceSaveError(error: unknown): ServiceSaveFailure {
  if (!(error instanceof ApiError)) {
    return { fields: {}, message: OFFLINE, signedOut: false };
  }
  switch (error.status) {
    case 401:
      return { fields: {}, message: "Please sign in again.", signedOut: true };
    case 403:
      return {
        fields: {},
        message: "You can only change services in your own salon.",
        signedOut: false,
      };
    case 404:
      return {
        fields: {},
        message:
          "We could not find this service. It may have been deleted. Reload the page.",
        signedOut: false,
      };
    case 422: {
      const { fields, general } = serviceServerErrors(error.fieldErrors);
      const hasFields = Object.keys(fields).length > 0;
      // When the API's detail is a plain sentence, ApiError carries it as its message.
      const sentence = error.message.startsWith("Something went wrong.")
        ? "Check the form and try again."
        : error.message;
      return {
        fields,
        message: general ?? (hasFields ? null : sentence),
        signedOut: false,
      };
    }
    case 500:
      return { fields: {}, message: GENERIC, signedOut: false };
    default:
      return { fields: {}, message: error.message, signedOut: false };
  }
}

export const HAS_BOOKINGS_MESSAGE =
  "This has bookings, so it can't be deleted. Cancel or complete them first.";

export type ServiceDeleteFailure = {
  message: string;
  signedOut: boolean;
};

/**
 * Turns a failed delete into a message. The API is meant to answer 409 when
 * the service has bookings. Checked against the live API: it answers a bare
 * 500 instead (even when every booking is cancelled), so a 500 is explained as
 * "most likely bookings" rather than shown as a plain server error.
 */
export function describeServiceDeleteError(
  error: unknown,
): ServiceDeleteFailure {
  if (!(error instanceof ApiError)) {
    return { message: OFFLINE, signedOut: false };
  }
  switch (error.status) {
    case 401:
      return { message: "Please sign in again.", signedOut: true };
    case 403:
      return {
        message: "You can only delete services in your own salon.",
        signedOut: false,
      };
    case 404:
      return {
        message:
          "This service is already gone. Reload the page to see the latest list.",
        signedOut: false,
      };
    case 409:
      return { message: HAS_BOOKINGS_MESSAGE, signedOut: false };
    case 500:
      return {
        message: `${HAS_BOOKINGS_MESSAGE} If it has no bookings, please try again in a moment.`,
        signedOut: false,
      };
    default:
      return { message: error.message, signedOut: false };
  }
}
