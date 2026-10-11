import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("labels the input and describes it with the hint", () => {
    render(<FormField id="pw" label="Password" hint="At least 8." />);
    const input = screen.getByLabelText("Password");
    expect(screen.getByText("At least 8.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-describedby", "pw-hint");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("hides the hint and describes the input by the error only", () => {
    render(
      <FormField
        id="pw"
        label="Password"
        hint="At least 8."
        error="Too short."
      />,
    );
    const input = screen.getByLabelText("Password");
    expect(screen.queryByText("At least 8.")).toBeNull();
    expect(screen.getByText("Too short.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-describedby", "pw-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("has no aria-describedby without hint or error", () => {
    render(<FormField id="name" label="Name" />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});
