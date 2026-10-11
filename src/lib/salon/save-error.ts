import { ApiError, type FieldErrors } from "@/lib/api";
import { salonServerErrors } from "./validate";

export type SalonSaveFailure = {
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

/** Turns whatever a failed create or edit threw into what the form shows. */
export function describeSaveError(
  error: unknown,
  mode: "create" | "edit",
): SalonSaveFailure {
  if (!(error instanceof ApiError)) {
    return { fields: {}, message: OFFLINE, signedOut: false };
  }
  switch (error.status) {
    case 401:
      return { fields: {}, message: "Please sign in again.", signedOut: true };
    case 403:
      return {
        fields: {},
        message:
          mode === "create"
            ? "Only salon owners can create a salon."
            : "You can only edit your own salon.",
        signedOut: false,
      };
    case 404:
      return {
        fields: {},
        message:
          "We could not find this salon. It may have been removed. Reload the page.",
        signedOut: false,
      };
    case 422: {
      const { fields, general } = salonServerErrors(error.fieldErrors);
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
