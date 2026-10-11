import { NextResponse, type NextRequest } from "next/server";
import {
  ROLE_COOKIE,
  TOKEN_COOKIE,
  clearedCookieOptions,
} from "@/lib/auth/cookie";
import { buildForwardHeaders } from "@/lib/proxy/headers";
import { buildTargetUrl } from "@/lib/proxy/target";
import {
  apiBaseUrl,
  fetchUpstream,
  upstreamErrorResponse,
} from "@/lib/proxy/upstream";

export const dynamic = "force-dynamic";
// Longest the Hobby plan allows (with Fluid Compute): room for a cold start
// of the free-tier API plus one retry.
export const maxDuration = 300;

type RouteContext = { params: Promise<{ path: string[] }> };

// Login must go through /api/auth/login so the token is never sent to the
// browser. Everything else is forwarded as is.
function isBlocked(segments: string[]): boolean {
  const [first, second] = segments.map((segment) => {
    try {
      return decodeURIComponent(segment).toLowerCase();
    } catch {
      return segment.toLowerCase();
    }
  });
  return first === "auth" && second === "login";
}

async function forward(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  const base = apiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "The server is not configured." },
      { status: 500 },
    );
  }

  const target = buildTargetUrl(base, path, request.nextUrl.search);
  if (!target || isBlocked(path)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const result = await fetchUpstream(target, {
    method: request.method,
    headers: buildForwardHeaders(request.headers, token),
    body: hasBody ? await request.arrayBuffer() : undefined,
  });
  if (!result.ok) return upstreamErrorResponse(result.reason);

  const upstream = result.response;

  if (upstream.status === 401) {
    const response = NextResponse.json(
      { error: "Please sign in again." },
      { status: 401 },
    );
    response.cookies.set(TOKEN_COOKIE, "", clearedCookieOptions());
    response.cookies.set(ROLE_COOKIE, "", clearedCookieOptions());
    return response;
  }

  if (upstream.status === 204 || upstream.status === 304) {
    return new NextResponse(null, { status: upstream.status });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
};
