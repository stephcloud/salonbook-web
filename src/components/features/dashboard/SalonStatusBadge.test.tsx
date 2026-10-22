import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SalonStatusBadge } from "./SalonStatusBadge";

describe("SalonStatusBadge", () => {
  it.each([
    ["pending", "Waiting for approval", "bg-status-pending-bg"],
    ["approved", "Approved", "bg-status-confirmed-bg"],
    ["suspended", "Suspended", "bg-status-cancelled-bg"],
  ] as const)("shows %s as %s", (status, label, colour) => {
    render(<SalonStatusBadge status={status} />);
    expect(screen.getByText(label)).toHaveClass(colour);
  });
});
