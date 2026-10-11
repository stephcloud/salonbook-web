import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoleChoice } from "./RoleChoice";

describe("RoleChoice", () => {
  it("offers both roles with nothing selected by default", () => {
    render(<RoleChoice value="" onChange={vi.fn()} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    radios.forEach((radio) => expect(radio).not.toBeChecked());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reports the chosen role", async () => {
    const onChange = vi.fn();
    render(<RoleChoice value="" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText(/I own a salon/));
    expect(onChange).toHaveBeenCalledWith("owner");
    await userEvent.click(screen.getByLabelText(/I want to book/));
    expect(onChange).toHaveBeenCalledWith("client");
  });

  it("marks the current value as selected", () => {
    render(<RoleChoice value="owner" onChange={vi.fn()} />);
    expect(screen.getByLabelText(/I own a salon/)).toBeChecked();
    expect(screen.getByLabelText(/I want to book/)).not.toBeChecked();
  });

  it("shows the error and links it to the group", () => {
    render(<RoleChoice value="" onChange={vi.fn()} error="Pick one." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Pick one.");
    expect(screen.getByRole("group")).toHaveAttribute(
      "aria-describedby",
      alert.id,
    );
  });
});
