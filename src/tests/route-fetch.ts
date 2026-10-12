import { vi } from "vitest";

type Call = { key: string; body: unknown };
type Handler = (call: Call) => Response | Promise<Response>;

/**
 * Stubs `fetch` with one handler per "METHOD /path" (query string ignored).
 * An unmatched request throws, so a test never silently calls the network.
 * Returns the mock and the list of requests it received.
 */
export function routeFetch(routes: Record<string, Handler>) {
  const calls: Call[] = [];
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${String(url).split("?")[0]}`;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const call = { key, body };
    calls.push(call);
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    return handler(call);
  });
  vi.stubGlobal("fetch", mock);
  return {
    mock,
    calls,
    count: (key: string) => calls.filter((c) => c.key === key).length,
  };
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}
