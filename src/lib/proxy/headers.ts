const FORWARDED_HEADERS = ["accept", "accept-language", "content-type"];

/**
 * Only an allowlist of browser headers is forwarded. Cookie, Host and any
 * browser-sent Authorization never reach the API; the token comes from the
 * httpOnly cookie and is added here.
 */
export function buildForwardHeaders(
  incoming: Headers,
  token: string | undefined,
): Headers {
  const out = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = incoming.get(name);
    if (value) out.set(name, value);
  }
  if (token) out.set("authorization", `Bearer ${token}`);
  return out;
}
