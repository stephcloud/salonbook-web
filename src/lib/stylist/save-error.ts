import { ApiError, type FieldErrors } from "@/lib/api";
import { stylistServerErrors } from "./validate";

export type StylistFailure = {
  /** Messages for the form's own fields (from a 422). */
  fields: FieldErrors;
  /** A message for the whole form, or null when the field messages say it all. */
  message: string | null;
  /** The API said the session is over; the browser is already going to /login. */
  signedOut: boolean;
  /**
   * The server did not answer, so the stylist may have been created anyway.
   * The lists should be re-read and the owner told to check before retrying.
   */
  uncertain?: boolean;
};

const GENERIC = "Something went wrong on our side. Please try again.";
const OFFLINE =
  "Could not reach the server. Check your connection and try again.";

/** Turns a failed "add stylist" call into what the dialog shows. */
export function describeStylistCreateError(error: unknown): StylistFailure {
  if (!(error instanceof ApiError)) {
    return { fields: {}, message: OFFLINE, signedOut: false };
  }
  switch (error.status) {
    case 401:
      return { fields: {}, message: "Please sign in again.", signedOut: true };
    case 403:
      return {
        fields: {},
        message: "You can only add stylists to your own salon.",
        signedOut: false,
      };
    case 404:
      return {
        fields: {},
        message: "We could not find this salon. Reload the page.",
        signedOut: false,
      };
    case 422: {
      const { fields, general } = stylistServerErrors(error.fieldErrors);
      const hasFields = Object.keys(fields).length > 0;
      return {
        fields,
        message:
          general ?? (hasFields ? null : "Check the form and try again."),
        signedOut: false,
      };
    }
    case 500:
      return { fields: {}, message: GENERIC, signedOut: false };
    case 502:
    case 504:
      return {
        fields: {},
        message:
          "The server did not answer in time. The stylist may have been added. Check the list before you try again, so you do not add them twice.",
        signedOut: false,
        uncertain: true,
      };
    default:
      return { fields: {}, message: error.message, signedOut: false };
  }
}

/** Turns a failed "save services for this stylist" call into a message. */
export function describeAssignError(error: unknown): {
  message: string;
  signedOut: boolean;
} {
  if (!(error instanceof ApiError)) {
    return { message: OFFLINE, signedOut: false };
  }
  switch (error.status) {
    case 401:
      return { message: "Please sign in again.", signedOut: true };
    case 403:
      return {
        message: "You can only change stylists in your own salon.",
        signedOut: false,
      };
    case 404:
      return {
        message: "We could not find this stylist. Reload the page.",
        signedOut: false,
      };
    case 422:
      return {
        message:
          "One of the services is no longer in this salon. Reload the page and try again.",
        signedOut: false,
      };
    case 500:
      return { message: GENERIC, signedOut: false };
    default:
      return { message: error.message, signedOut: false };
  }
}

export type StylistChangeFailure = StylistFailure & {
  /** The API answered 404: the stylist no longer exists, so the list should be re-read. */
  gone?: boolean;
};

const GONE = "This stylist no longer exists. The list has been refreshed.";

// The live openapi lists only 200/204 and 422 for PATCH and DELETE
// /stylists/{id}. The 403 (not your salon), 404 (no such stylist) and 409
// (delete with bookings) below come from salonbook-api's
// app/services/stylists.py: check there if the backend changes.

/** Turns a failed "edit stylist" call into what the dialog shows. */
export function describeStylistUpdateError(
  error: unknown,
): StylistChangeFailure {
  if (!(error instanceof ApiError)) {
    return { fields: {}, message: OFFLINE, signedOut: false };
  }
  switch (error.status) {
    case 401:
      return { fields: {}, message: "Please sign in again.", signedOut: true };
    case 403:
      return {
        fields: {},
        message: "You can only change stylists in your own salon.",
        signedOut: false,
      };
    case 404:
      return { fields: {}, message: GONE, signedOut: false, gone: true };
    case 422: {
      const { fields, general } = stylistServerErrors(error.fieldErrors);
      const hasFields = Object.keys(fields).length > 0;
      return {
        fields,
        message:
          general ?? (hasFields ? null : "Check the form and try again."),
        signedOut: false,
      };
    }
    case 500:
      return { fields: {}, message: GENERIC, signedOut: false };
    default:
      return { fields: {}, message: error.message, signedOut: false };
  }
}

export const STYLIST_HAS_BOOKINGS_MESSAGE =
  "This stylist has bookings, so they can't be deleted. You can edit their name or photo instead.";

export type StylistDeleteFailure = {
  message: string;
  signedOut: boolean;
  /** 404: already gone, so the list should be re-read. */
  gone?: boolean;
  /** 409: they have bookings; offer to edit instead. */
  hasBookings?: boolean;
  /** 403: trying again cannot work. */
  forbidden?: boolean;
};

/** Turns a failed "delete stylist" call into what the dialog shows. */
export function describeStylistDeleteError(
  error: unknown,
): StylistDeleteFailure {
  if (!(error instanceof ApiError)) {
    return { message: OFFLINE, signedOut: false };
  }
  switch (error.status) {
    case 401:
      return { message: "Please sign in again.", signedOut: true };
    case 403:
      return {
        message: "You can only delete stylists in your own salon.",
        signedOut: false,
        forbidden: true,
      };
    case 404:
      return { message: GONE, signedOut: false, gone: true };
    case 409:
      return {
        message: STYLIST_HAS_BOOKINGS_MESSAGE,
        signedOut: false,
        hasBookings: true,
      };
    case 500:
      return { message: GENERIC, signedOut: false };
    default:
      return { message: error.message, signedOut: false };
  }
}
