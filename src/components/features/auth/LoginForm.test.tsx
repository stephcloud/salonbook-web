import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

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

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password1");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it("shows client validation errors and does not call the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm next={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a clear message for a wrong password", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: "Incorrect email or password." },
          { status: 401 },
        ),
      ),
    );
    render(<LoginForm next={null} />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect email or password.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the server's 422 field errors next to the field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: "Check the form.",
            detail: [
              { loc: ["body", "email"], msg: "Server says no", type: "x" },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    render(<LoginForm next={null} />);
    await fillAndSubmit();
    expect(await screen.findByText("Server says no")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("sends owners to the dashboard and honours a safe next", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ user: { role: "owner" } })),
    );
    render(<LoginForm next={null} />);
    await fillAndSubmit();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows the waking-up message when the server is slow", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(<LoginForm next={null} />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password1" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.queryByText(/Waking up/)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(screen.getByText(/Waking up the server/)).toBeInTheDocument();
  });
});
