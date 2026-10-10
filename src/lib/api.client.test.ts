import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, authFetch, parseFieldErrors } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("parseFieldErrors", () => {
  it("maps the last loc part to its message, first message wins", () => {
    expect(
      parseFieldErrors([
        { loc: ["body", "email"], msg: "bad email", type: "x" },
        { loc: ["body", "email"], msg: "second", type: "x" },
        { loc: ["body", "password"], msg: "too short", type: "x" },
      ]),
    ).toEqual({ email: "bad email", password: "too short" });
  });

  it("ignores junk", () => {
    expect(parseFieldErrors("nope")).toEqual({});
    expect(parseFieldErrors([null, { loc: "x" }])).toEqual({});
  });
});

describe("apiFetch / authFetch", () => {
  it("calls the proxy on our own origin", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("/salons")).resolves.toEqual({ ok: 1 });
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe("/api/proxy/salons");
  });

  it("goes to /login?next= on 401 from the proxy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "x" }, { status: 401 })),
    );
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { pathname: "/bookings", search: "?a=1", assign },
    });
    await expect(apiFetch("bookings")).rejects.toBeInstanceOf(ApiError);
    expect(assign).toHaveBeenCalledWith("/login?next=%2Fbookings%3Fa%3D1");
  });

  it("does not redirect on a 401 from the login handler", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: "Incorrect email or password." },
          { status: 401 },
        ),
      ),
    );
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    await expect(authFetch("login", {})).rejects.toMatchObject({
      status: 401,
      message: "Incorrect email or password.",
    });
    expect(assign).not.toHaveBeenCalled();
  });

  it("exposes 422 field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { detail: [{ loc: ["body", "email"], msg: "bad", type: "x" }] },
          { status: 422 },
        ),
      ),
    );
    await expect(apiFetch("auth/register", { body: {} })).rejects.toMatchObject(
      {
        status: 422,
        fieldErrors: { email: "bad" },
      },
    );
  });
});
