import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { components } from "@/lib/api-types";
import { TOKEN_COOKIE } from "@/lib/auth/cookie";
import { safeNextPath } from "@/lib/auth/safe-next";
import { apiBaseUrl, fetchUpstream } from "@/lib/proxy/upstream";

export type CurrentUser = components["schemas"]["UserResponse"];

/**
 * The signed-in user from GET /auth/me, or null when there is no cookie or the
 * token is no longer valid. Reading cookies makes the calling page dynamic.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const base = apiBaseUrl();
  if (!token || !base) return null;

  const result = await fetchUpstream(`${base}/auth/me`, {
    method: "GET",
    headers: new Headers({
      accept: "application/json",
      authorization: `Bearer ${token}`,
    }),
  });
  // Only a rejected token means "signed out". An outage must not bounce
  // signed-in users to /login, so it throws and app/error.tsx offers a retry.
  if (!result.ok) throw new Error("The server is not responding.");
  const { status } = result.response;
  if (status === 401 || status === 403) return null;
  if (!result.response.ok) throw new Error("Could not load your account.");
  return (await result.response.json()) as CurrentUser;
});

export function loginRedirectUrl(next: string): string {
  const safe = safeNextPath(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

/** For pages that need a signed-in user: redirects to /login?next= otherwise. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginRedirectUrl(next));
  return user;
}
