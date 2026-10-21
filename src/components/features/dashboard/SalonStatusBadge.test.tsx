import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SalonStatusBadge } from "./SalonStatusBadge";

describe("SalonStatusBadge", () => {
  it.each([
    ["pending", "Waiting for approval", "bg-amber-100"],
    ["approved", "Approved", "bg-green-100"],
    ["suspended", "Suspended", "bg-gray-100"],
  ] as const)("shows %s as %s", (status, label, colour) => {
    render(<SalonStatusBadge status={status} />);
    expect(screen.getByText(label)).toHaveClass(colour);
  });
});
