import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Stylists never sign in, but the API requires an email and a password for
 * each one. These are made on the server for a single request and thrown away:
 * the email is a unique address at the reserved domain example.com (it can
 * never receive mail) and the password is 32 random bytes. Nothing here is
 * returned to the browser, stored or logged.
 */
export function makePlaceholderCredentials(): {
  email: string;
  password: string;
} {
  return {
    email: `stylist-${randomBytes(12).toString("hex")}@example.com`,
    password: randomBytes(32).toString("base64url"),
  };
}
