import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentLoading } from "./PaymentLoading";

describe("PaymentLoading", () => {
  it("has a heading, a status sentence and the main landmark", () => {
    render(
      <PaymentLoading
        title="Confirming your payment..."
        description="This usually takes a few seconds."
      />,
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Confirming your payment...",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "This usually takes a few seconds.",
    );
    expect(screen.queryByText(/waking up the server/i)).toBeNull();
  });
});
