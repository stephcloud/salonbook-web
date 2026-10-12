import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Service } from "@/lib/api";
import { ServiceCheckboxList } from "./ServiceCheckboxList";

function service(id: string, name: string, minutes = 60): Service {
  return {
    id,
    salon_id: "s",
    name,
    duration_minutes: minutes,
    price_type: "fixed",
    price: 100000,
    created_at: "2026-10-12T00:00:00Z",
  };
}

const SERVICES = [service("a", "Braids", 90), service("b", "Nails")];

function renderList(selected: string[], disabled = false) {
  const onChange = vi.fn();
  render(
    <ServiceCheckboxList
      idPrefix="t"
      legend="Pick services"
      services={SERVICES}
      selected={selected}
      onChange={onChange}
      disabled={disabled}
    />,
  );
  return onChange;
}

describe("ServiceCheckboxList", () => {
  it("shows a group with one checkbox per service, ticked as selected", () => {
    renderList(["b"]);
    expect(
      screen.getByRole("group", { name: "Pick services" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: /^Braids/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^Nails/ })).toBeChecked();
  });

  it("adds a service to the selection when ticked", () => {
    const onChange = renderList(["b"]);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Braids/ }));
    expect(onChange).toHaveBeenCalledWith(["b", "a"]);
  });

  it("removes a service from the selection when unticked", () => {
    const onChange = renderList(["a", "b"]);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Braids/ }));
    expect(onChange).toHaveBeenCalledWith(["b"]);
  });

  it("cannot be toggled while disabled", () => {
    const onChange = renderList([], true);
    const box = screen.getByRole("checkbox", { name: /^Braids/ });
    expect(box).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(box);
    expect(onChange).not.toHaveBeenCalled();
  });
});
