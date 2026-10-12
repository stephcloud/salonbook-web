import { NextResponse, type NextRequest } from "next/server";
import {
  ROLE_COOKIE,
  TOKEN_COOKIE,
  clearedCookieOptions,
} from "@/lib/auth/cookie";
import {
  apiBaseUrl,
  fetchUpstream,
  upstreamErrorResponse,
} from "@/lib/proxy/upstream";
import { makePlaceholderCredentials } from "@/lib/stylist/credentials";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// FastAPI echoes the submitted body in `input`, which here includes the
// generated password. Only the field and the message ever leave this route.
function safeDetail(raw: unknown): { loc: unknown; msg: unknown }[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .map((item: { loc?: unknown; msg?: unknown }) => ({
      loc: item?.loc,
      msg: item?.msg,
    }))
    .filter(
      // email and password are ours, not something the owner can fix.
      (item) =>
        !(
          Array.isArray(item.loc) &&
          item.loc.some((part) => part === "email" || part === "password")
        ),
    );
}

/**
 * Adds a stylist. Stylists never sign in, but the API requires an email and a
 * password for each one, so they are made here, for this one request: a unique
 * address at example.com and a long random password. They are never returned,
 * stored or logged. The owner's token comes from the httpOnly cookie.
 */
export async function POST(request: NextRequest) {
  const base = apiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "The server is not configured." },
      { status: 500 },
    );
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Please sign in again." },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { salon_id, name, image_url } = (payload ?? {}) as Record<
    string,
    unknown
  >;
  if (
    typeof salon_id !== "string" ||
    !UUID.test(salon_id) ||
    typeof name !== "string" ||
    (image_url !== undefined && typeof image_url !== "string")
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { email, password } = makePlaceholderCredentials();
  const result = await fetchUpstream(
    `${base}/salons/${encodeURIComponent(salon_id)}/stylists`,
    {
      method: "POST",
      headers: new Headers({
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${token}`,
      }),
      body: JSON.stringify({
        name,
        email,
        password,
        ...(image_url ? { image_url } : {}),
      }),
    },
  );
  if (!result.ok) return upstreamErrorResponse(result.reason);
  const { response } = result;

  if (response.status === 401) {
    const out = NextResponse.json(
      { error: "Please sign in again." },
      { status: 401 },
    );
    out.cookies.set(TOKEN_COOKIE, "", clearedCookieOptions());
    out.cookies.set(ROLE_COOKIE, "", clearedCookieOptions());
    return out;
  }

  if (response.status === 201) {
    const created = (await response.json().catch(() => null)) as {
      id?: unknown;
      name?: unknown;
      image_url?: unknown;
    } | null;
    if (typeof created?.id !== "string" || typeof created.name !== "string") {
      return NextResponse.json(
        { error: "Could not read the new stylist. Reload the page." },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        image_url:
          typeof created.image_url === "string" ? created.image_url : null,
      },
      { status: 201 },
    );
  }

  const body: unknown = await response.json().catch(() => null);
  const raw =
    body && typeof body === "object"
      ? (body as { detail?: unknown }).detail
      : undefined;

  if (response.status === 422) {
    const detail = safeDetail(raw);
    return NextResponse.json(
      { error: "Check the form.", detail: detail ?? undefined },
      { status: 422 },
    );
  }
  if (response.status === 403) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (response.status === 404) {
    return NextResponse.json({ error: "salon not found" }, { status: 404 });
  }
  return NextResponse.json(
    { error: "Could not add the stylist. Please try again." },
    { status: response.status >= 500 ? 502 : response.status },
  );
}
