import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PLACEHOLDERS } from "@/lib/landing-placeholders";
import { ImagePlaceholder } from "./ImagePlaceholder";

describe("ImagePlaceholder", () => {
  it("is hidden from assistive tech, has no text and names its replacement file", () => {
    const { container } = render(<ImagePlaceholder slot="stylistAtWork" />);
    const tile = container.firstElementChild;
    expect(tile).toHaveAttribute("aria-hidden", "true");
    expect(tile).toHaveAttribute(
      "data-placeholder",
      "stylist-at-work-placeholder.webp",
    );
    expect(tile).toHaveTextContent("");
  });

  it("keeps each slot's aspect ratio so nothing shifts when the image arrives", () => {
    for (const [slot, { ratio }] of Object.entries(PLACEHOLDERS)) {
      const { container } = render(
        <ImagePlaceholder slot={slot as keyof typeof PLACEHOLDERS} />,
      );
      expect(container.firstElementChild).toHaveClass(ratio);
    }
  });
});
