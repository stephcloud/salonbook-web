import { NextResponse } from "next/server";
import { TOKEN_COOKIE, tokenCookieOptions } from "@/lib/auth/cookie";
import type { components } from "@/lib/api-types";
import {
  apiBaseUrl,
  fetchUpstream,
  upstreamErrorResponse,
} from "@/lib/proxy/upstream";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Token = components["schemas"]["Token"];
type UserResponse = components["schemas"]["UserResponse"];

export async function POST(request: Request) {
  const base = apiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "The server is not configured." },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { email, password } = (payload ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 422 },
    );
  }

  const login = await fetchUpstream(`${base}/auth/login`, {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      accept: "application/json",
    }),
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) return upstreamErrorResponse(login.reason);

  if (login.response.status === 401) {
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }
  if (login.response.status === 422) {
    const body: unknown = await login.response.json().catch(() => null);
    const raw =
      body && typeof body === "object" && "detail" in body
        ? (body as { detail: unknown }).detail
        : undefined;
    // Keep only loc and msg: FastAPI's `input` echoes the submitted password.
    const detail = Array.isArray(raw)
      ? raw.map((item: { loc?: unknown; msg?: unknown }) => ({
          loc: item?.loc,
          msg: item?.msg,
        }))
      : undefined;
    return NextResponse.json(
      { error: "Check the form.", detail },
      { status: 422 },
    );
  }
  if (login.response.status === 429) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429 },
    );
  }
  if (!login.response.ok) {
    return NextResponse.json(
      { error: "Could not sign in. Please try again." },
      { status: 502 },
    );
  }

  const token = (await login.response.json().catch(() => null)) as Token | null;
  if (!token?.access_token) {
    return NextResponse.json(
      { error: "Could not sign in. Please try again." },
      { status: 502 },
    );
  }

  const me = await fetchUpstream(`${base}/auth/me`, {
    method: "GET",
    headers: new Headers({
      accept: "application/json",
      authorization: `Bearer ${token.access_token}`,
    }),
  });
  if (!me.ok) return upstreamErrorResponse(me.reason);
  if (!me.response.ok) {
    return NextResponse.json(
      { error: "Could not sign in. Please try again." },
      { status: 502 },
    );
  }
  const user = (await me.response
    .json()
    .catch(() => null)) as UserResponse | null;
  if (!user) {
    return NextResponse.json(
      { error: "Could not sign in. Please try again." },
      { status: 502 },
    );
  }

  const response = NextResponse.json({ user });
  response.cookies.set(TOKEN_COOKIE, token.access_token, tokenCookieOptions());
  return response;
}
