import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./RegisterForm";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  replace.mockReset();
  refresh.mockReset();
});

async function fillAndSubmit(role: "I want to book" | "I own a salon") {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText(new RegExp(role)));
  await user.type(screen.getByLabelText("Full name"), "Ada Obi");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password1");
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

function urlOf(call: unknown[]): string {
  return String(call[0]);
}

describe("RegisterForm", () => {
  it("shows client validation errors and does not call the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm next={null} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );
    expect(
      screen.getByText("Choose how you will use SalonBook."),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Choose a password.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a password that is too short", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm next={null} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/I want to book/));
    await user.type(screen.getByLabelText("Full name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers, signs in and sends an owner to the dashboard", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/auth/login")
        ? Response.json({ user: { role: "owner" } })
        : Response.json({}, { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm next={null} />);
    await fillAndSubmit("I own a salon");
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(refresh).toHaveBeenCalled();

    expect(urlOf(fetchMock.mock.calls[0])).toBe("/api/proxy/auth/register");
    const registerInit = (
      fetchMock.mock.calls[0] as unknown[]
    )[1] as RequestInit;
    expect(JSON.parse(String(registerInit.body))).toEqual({
      name: "Ada Obi",
      email: "ada@example.com",
      password: "password1",
      role: "owner",
    });
    expect(urlOf(fetchMock.mock.calls[1])).toBe("/api/auth/login");
  });

  it("sends a client to the salons list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/auth/login")
          ? Response.json({ user: { role: "client" } })
          : Response.json({}, { status: 201 }),
      ),
    );
    render(<RegisterForm next={null} />);
    await fillAndSubmit("I want to book");
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/salons"));
  });

  it("goes to next when one is given", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/auth/login")
          ? Response.json({ user: { role: "client" } })
          : Response.json({}, { status: 201 }),
      ),
    );
    render(<RegisterForm next="/book/abc" />);
    await fillAndSubmit("I want to book");
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/book/abc"));
  });

  it("keeps the next path on the sign in link", () => {
    render(<RegisterForm next="/book/abc" />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=%2Fbook%2Fabc",
    );
  });

  it("shows the server's 422 field errors next to the field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            detail: [
              { loc: ["body", "email"], msg: "Email already used", type: "x" },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    render(<RegisterForm next={null} />);
    await fillAndSubmit("I want to book");
    expect(await screen.findByText("Email already used")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the server message when registration fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ detail: "Email already registered" }, { status: 409 }),
      ),
    );
    render(<RegisterForm next={null} />);
    await fillAndSubmit("I want to book");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email already registered",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a connection message when the server cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network");
      }),
    );
    render(<RegisterForm next={null} />);
    await fillAndSubmit("I want to book");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the server",
    );
  });

  it("explains when the account was created but sign in failed, and does not register twice on retry", async () => {
    let loginCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/register"))
        return Response.json({}, { status: 201 });
      loginCalls += 1;
      return loginCalls === 1
        ? Response.json({ error: "Down" }, { status: 502 })
        : Response.json({ user: { role: "client" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm next={null} />);
    await fillAndSubmit("I want to book");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your account was created, but we could not sign you in.",
    );
    expect(replace).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/salons"));
    const registerCalls = fetchMock.mock.calls.filter((call) =>
      urlOf(call).endsWith("/auth/register"),
    );
    expect(registerCalls).toHaveLength(1);
  });

  it("shows the waking-up message when the server is slow", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(<RegisterForm next={null} />);
    fireEvent.click(screen.getByLabelText(/I want to book/));
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Ada" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password1" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }));
    expect(screen.queryByText(/Waking up/)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(screen.getByText(/Waking up the server/)).toBeInTheDocument();
  });
});
