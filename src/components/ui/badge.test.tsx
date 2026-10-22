import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge status variants", () => {
  it.each(["pending", "confirmed", "cancelled", "refunded"] as const)(
    "%s uses its status tokens",
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toHaveClass(
        `bg-status-${variant}-bg`,
        `text-status-${variant}-fg`,
        `border-status-${variant}-border`,
      );
    },
  );
});
