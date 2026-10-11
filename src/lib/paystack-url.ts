/**
 * True only for an https link on paystack.com or one of its subdomains (the
 * API returns https://checkout.paystack.com/...). Anything else is never
 * followed, so a wrong or tampered `authorization_url` cannot send the client
 * to another site.
 */
export function isSafeCheckoutUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      (url.hostname === "paystack.com" ||
        url.hostname.endsWith(".paystack.com")) &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}
