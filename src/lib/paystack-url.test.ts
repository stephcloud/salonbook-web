import { describe, expect, it } from "vitest";
import { isSafeCheckoutUrl } from "./paystack-url";

describe("isSafeCheckoutUrl", () => {
  it("accepts the checkout link the API returns", () => {
    expect(
      isSafeCheckoutUrl("https://checkout.paystack.com/8aaow7bva6qwfi3"),
    ).toBe(true);
    expect(isSafeCheckoutUrl("https://paystack.com/pay/abc")).toBe(true);
  });

  it.each([
    ["plain http", "http://checkout.paystack.com/abc"],
    ["another site", "https://evil.example.com/pay"],
    ["lookalike suffix", "https://evilpaystack.com/abc"],
    [
      "paystack as a subdomain of another site",
      "https://paystack.com.evil.com/abc",
    ],
    ["credentials in the link", "https://user:pw@checkout.paystack.com/abc"],
    ["javascript link", "javascript:alert(1)"],
    ["data link", "data:text/html,hi"],
    ["relative path", "/payment/callback"],
    ["empty string", ""],
  ])("rejects %s", (_name, url) => {
    expect(isSafeCheckoutUrl(url)).toBe(false);
  });

  it("rejects values that are not strings", () => {
    expect(isSafeCheckoutUrl(null)).toBe(false);
    expect(isSafeCheckoutUrl(undefined)).toBe(false);
    expect(isSafeCheckoutUrl(42)).toBe(false);
  });
});
