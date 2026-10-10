import "server-only";
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
export async function getCurrentUser(): Promise<CurrentUser | null> {
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
  if (!result.ok || !result.response.ok) return null;
  return (await result.response.json()) as CurrentUser;
}

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

export function homeForRole(role: string): string {
  return role === "owner" ? "/dashboard" : "/salons";
}
