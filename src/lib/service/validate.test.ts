import { describe, expect, it } from "vitest";
import type { Service } from "@/lib/api";
import {
  EMPTY_SERVICE_VALUES,
  PRICE_RANGE_MESSAGE,
  changedServiceFields,
  serviceServerErrors,
  toServicePayload,
  validateService,
  valuesFromService,
  type ServiceFormValues,
} from "./validate";

const FIXED: ServiceFormValues = {
  name: "  Braids ",
  duration_minutes: "90",
  price_type: "fixed",
  price: "5,000.50",
};

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: "s1",
    salon_id: "salon",
    name: "Braids",
    duration_minutes: 90,
    price_type: "fixed",
    price: 500050,
    created_at: "2026-10-12T00:00:00Z",
    ...overrides,
  };
}

describe("toServicePayload", () => {
  it("converts naira to whole kobo in one place", () => {
    expect(toServicePayload(FIXED)).toEqual({
      name: "Braids",
      duration_minutes: 90,
      price_type: "fixed",
      price: 500050,
    });
  });

  it("never sends floating-point kobo", () => {
    const { price } = toServicePayload({ ...FIXED, price: "19.99" });
    expect(price).toBe(1999);
    expect(Number.isInteger(price)).toBe(true);
  });

  it("sends no price for a quote, even if one was typed before switching", () => {
    expect(
      toServicePayload({ ...FIXED, price_type: "quote", price: "5000" }),
    ).toEqual({ name: "Braids", duration_minutes: 90, price_type: "quote" });
  });
});

describe("validateService", () => {
  it("accepts a good fixed service and a quote with no price", () => {
    expect(validateService(FIXED)).toEqual({});
    expect(
      validateService({ ...FIXED, price_type: "quote", price: "" }),
    ).toEqual({});
  });

  it("does not ask for a price on a quote", () => {
    expect(
      validateService({ ...FIXED, price_type: "quote", price: "abc" }).price,
    ).toBeUndefined();
  });

  it("requires a price on a fixed service, within the API range", () => {
    expect(validateService({ ...FIXED, price: "" }).price).toBe(
      PRICE_RANGE_MESSAGE,
    );
    expect(validateService({ ...FIXED, price: "0" }).price).toBe(
      PRICE_RANGE_MESSAGE,
    );
    expect(validateService({ ...FIXED, price: "1000001" }).price).toBe(
      PRICE_RANGE_MESSAGE,
    );
    expect(
      validateService({ ...FIXED, price: "1000000" }).price,
    ).toBeUndefined();
  });

  it("checks name and duration limits", () => {
    const errors = validateService(EMPTY_SERVICE_VALUES);
    expect(errors.name).toBeDefined();
    expect(errors.duration_minutes).toBeDefined();
    expect(validateService({ ...FIXED, name: "x".repeat(101) }).name).toMatch(
      /100/,
    );
    for (const bad of ["0", "1441", "1.5", "-5", "abc", ""]) {
      expect(
        validateService({ ...FIXED, duration_minutes: bad }).duration_minutes,
      ).toBeDefined();
    }
    expect(
      validateService({ ...FIXED, duration_minutes: "1440" }).duration_minutes,
    ).toBeUndefined();
  });
});

describe("changedServiceFields", () => {
  it("is empty when nothing changed", () => {
    expect(
      changedServiceFields(service(), valuesFromService(service())),
    ).toEqual({});
  });

  it("sends only the changed fields", () => {
    const values = { ...valuesFromService(service()), name: "Knotless" };
    expect(changedServiceFields(service(), values)).toEqual({
      name: "Knotless",
    });
    const priced = { ...valuesFromService(service()), price: "6000" };
    expect(changedServiceFields(service(), priced)).toEqual({ price: 600000 });
  });

  it("switching fixed to quote sends the type and price: null", () => {
    const values = {
      ...valuesFromService(service()),
      price_type: "quote" as const,
    };
    expect(changedServiceFields(service(), values)).toEqual({
      price_type: "quote",
      price: null,
    });
  });

  it("switching quote to fixed sends the type and the new price", () => {
    const quote = service({ price_type: "quote", price: null });
    const values = {
      ...valuesFromService(quote),
      price_type: "fixed" as const,
      price: "2500",
    };
    expect(changedServiceFields(quote, values)).toEqual({
      price_type: "fixed",
      price: 250000,
    });
  });

  it("starts the form from the stored kobo as naira", () => {
    expect(valuesFromService(service()).price).toBe("5000.50");
    expect(
      valuesFromService(service({ price_type: "quote", price: null })).price,
    ).toBe("");
  });
});

describe("serviceServerErrors (422 mapping)", () => {
  it("puts messages on the form's own fields", () => {
    expect(
      serviceServerErrors({
        name: "String should have at least 1 character",
        duration_minutes: "Input should be less than or equal to 1440",
      }),
    ).toEqual({
      fields: {
        name: "String should have at least 1 character",
        duration_minutes: "Input should be less than or equal to 1440",
      },
      general: null,
    });
  });

  it("replaces the API's kobo wording on the price", () => {
    expect(
      serviceServerErrors({ price: "Input should be greater than 0" }).fields
        .price,
    ).toBe(PRICE_RANGE_MESSAGE);
  });

  it("sends unknown fields to a general message", () => {
    expect(serviceServerErrors({ body: "Value error, something" })).toEqual({
      fields: {},
      general: "Value error, something",
    });
  });
});
