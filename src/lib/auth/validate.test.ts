import { describe, expect, it } from "vitest";
import { validateLogin, validateRegister } from "./validate";

describe("validateLogin", () => {
  it("accepts valid values", () => {
    expect(validateLogin({ email: "a@b.co", password: "whatever" })).toEqual(
      {},
    );
  });

  it("flags empty and malformed fields", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "Enter your email.",
      password: "Enter your password.",
    });
    expect(validateLogin({ email: "nope", password: "x" }).email).toMatch(
      /valid email/i,
    );
  });
});

describe("validateRegister", () => {
  const ok = {
    name: "Ada",
    email: "ada@example.com",
    password: "password1",
    role: "client" as const,
  };

  it("accepts valid values", () => {
    expect(validateRegister(ok)).toEqual({});
  });

  it("requires a role, a name and a long enough password", () => {
    const errors = validateRegister({
      ...ok,
      role: "",
      name: " ",
      password: "short",
    });
    expect(Object.keys(errors).sort()).toEqual(["name", "password", "role"]);
  });

  it("enforces the API's max lengths", () => {
    expect(
      validateRegister({ ...ok, name: "x".repeat(101) }).name,
    ).toBeDefined();
    expect(
      validateRegister({ ...ok, password: "x".repeat(129) }).password,
    ).toBeDefined();
  });
});
