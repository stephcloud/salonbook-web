import { describe, expect, it } from "vitest";
import type { Salon } from "@/lib/api";
import {
  DEPOSIT_RANGE_MESSAGE,
  EMPTY_SALON_VALUES,
  SALON_LIMITS,
  changedFields,
  salonServerErrors,
  toSalonPayload,
  validateSalon,
  valuesFromSalon,
  type SalonFormValues,
} from "./validate";

const GOOD: SalonFormValues = {
  name: "Pink Studio",
  address: "12 Admiralty Way, Lekki",
  phone: "08012345678",
  image_url: "",
  cancellation_hours: "24",
  deposit_amount: "5000",
};

const SALON: Salon = {
  id: "salon-1",
  owner_id: "owner-1",
  name: "Pink Studio",
  address: "12 Admiralty Way, Lekki",
  phone: "08012345678",
  image_url: "https://example.com/a.png",
  cancellation_hours: 24,
  deposit_amount: 500000,
  created_at: "2026-10-01T10:00:00Z",
};

describe("validateSalon", () => {
  it("accepts good values, with or without an image", () => {
    expect(validateSalon(GOOD)).toEqual({});
    expect(
      validateSalon({ ...GOOD, image_url: "https://example.com/a.png" }),
    ).toEqual({});
  });

  it("starts the empty form with the API default of 24 hours and asks for the rest", () => {
    expect(EMPTY_SALON_VALUES.cancellation_hours).toBe("24");
    const errors = validateSalon(EMPTY_SALON_VALUES);
    expect(Object.keys(errors).sort()).toEqual([
      "address",
      "deposit_amount",
      "name",
      "phone",
    ]);
  });

  describe("text limits (same as the API)", () => {
    it("name: required, at most 100 characters; spaces alone do not count", () => {
      expect(validateSalon({ ...GOOD, name: "   " }).name).toBe(
        "Enter the salon name.",
      );
      expect(
        validateSalon({ ...GOOD, name: "a".repeat(100) }).name,
      ).toBeUndefined();
      expect(validateSalon({ ...GOOD, name: "a".repeat(101) }).name).toBe(
        "Use at most 100 characters.",
      );
    });

    it("address: required, at most 255 characters", () => {
      expect(validateSalon({ ...GOOD, address: "" }).address).toBe(
        "Enter the salon address.",
      );
      expect(
        validateSalon({ ...GOOD, address: "a".repeat(255) }).address,
      ).toBeUndefined();
      expect(validateSalon({ ...GOOD, address: "a".repeat(256) }).address).toBe(
        "Use at most 255 characters.",
      );
    });

    it("phone: 3 to 30 characters", () => {
      expect(validateSalon({ ...GOOD, phone: "" }).phone).toBe(
        "Enter a phone number.",
      );
      expect(validateSalon({ ...GOOD, phone: "08" }).phone).toBe(
        "Use at least 3 characters.",
      );
      expect(validateSalon({ ...GOOD, phone: "080" }).phone).toBeUndefined();
      expect(
        validateSalon({ ...GOOD, phone: "1".repeat(30) }).phone,
      ).toBeUndefined();
      expect(validateSalon({ ...GOOD, phone: "1".repeat(31) }).phone).toBe(
        "Use at most 30 characters.",
      );
    });
  });

  describe("image link (optional)", () => {
    it.each([
      ["http://example.com/a.png"],
      ["example.com/a.png"],
      ["https://example.com/a b.png"],
      ["https://"],
      ["ftp://example.com/a.png"],
    ])("rejects %j", (image_url) => {
      expect(validateSalon({ ...GOOD, image_url }).image_url).toBe(
        "Start with https:// and leave out spaces.",
      );
    });

    it("accepts a plain https link and ignores spaces around it", () => {
      expect(
        validateSalon({ ...GOOD, image_url: "  https://example.com/a.png  " }),
      ).toEqual({});
    });

    it("rejects more than 500 characters", () => {
      const long = `https://x.co/${"a".repeat(488)}`;
      expect(long).toHaveLength(501);
      expect(validateSalon({ ...GOOD, image_url: long }).image_url).toBe(
        "Use at most 500 characters.",
      );
      expect(
        validateSalon({ ...GOOD, image_url: long.slice(0, 500) }).image_url,
      ).toBeUndefined();
    });
  });

  describe("cancellation hours", () => {
    it.each([["0"], ["24"], ["720"]])("accepts %s", (hours) => {
      expect(
        validateSalon({ ...GOOD, cancellation_hours: hours })
          .cancellation_hours,
      ).toBeUndefined();
    });

    it.each([["721"], ["1000"]])("rejects %s as out of range", (hours) => {
      expect(
        validateSalon({ ...GOOD, cancellation_hours: hours })
          .cancellation_hours,
      ).toBe("Use a number from 0 to 720.");
    });

    it.each([[""], ["-1"], ["1.5"], ["abc"], ["2 4"]])(
      "rejects %j as not a whole number",
      (hours) => {
        expect(
          validateSalon({ ...GOOD, cancellation_hours: hours })
            .cancellation_hours,
        ).toBe("Enter a whole number of hours.");
      },
    );

    it("exposes the limits", () => {
      expect(SALON_LIMITS.hoursMax).toBe(720);
    });
  });

  describe("deposit in naira", () => {
    it.each([["1"], ["5000"], ["5,000.50"], ["1000000"], ["₦5,000"]])(
      "accepts %s",
      (deposit) => {
        expect(
          validateSalon({ ...GOOD, deposit_amount: deposit }).deposit_amount,
        ).toBeUndefined();
      },
    );

    it.each([
      [""],
      ["0"],
      ["-5"],
      ["abc"],
      ["5000.123"],
      ["1000000.01"],
      ["2000000"],
    ])("rejects %j with the range message in naira", (deposit) => {
      expect(
        validateSalon({ ...GOOD, deposit_amount: deposit }).deposit_amount,
      ).toBe(DEPOSIT_RANGE_MESSAGE);
    });

    it("states the range in naira, not kobo", () => {
      expect(DEPOSIT_RANGE_MESSAGE).toContain("₦1,000,000");
      expect(DEPOSIT_RANGE_MESSAGE).not.toMatch(/100000000/);
    });
  });
});

describe("toSalonPayload", () => {
  it("converts the naira deposit to kobo and trims the text", () => {
    expect(
      toSalonPayload({
        ...GOOD,
        name: "  Pink Studio ",
        deposit_amount: "5,000.50",
      }),
    ).toEqual({
      name: "Pink Studio",
      address: "12 Admiralty Way, Lekki",
      phone: "08012345678",
      cancellation_hours: 24,
      deposit_amount: 500050,
    });
  });

  it("leaves out the image when it is empty and keeps it when set", () => {
    expect("image_url" in toSalonPayload(GOOD)).toBe(false);
    expect(
      toSalonPayload({ ...GOOD, image_url: " https://example.com/a.png " })
        .image_url,
    ).toBe("https://example.com/a.png");
  });

  it("sends only the API's own field names (the API refuses extra fields)", () => {
    expect(Object.keys(toSalonPayload(GOOD)).sort()).toEqual([
      "address",
      "cancellation_hours",
      "deposit_amount",
      "name",
      "phone",
    ]);
  });

  it("refuses an invalid deposit instead of sending a wrong amount", () => {
    expect(() => toSalonPayload({ ...GOOD, deposit_amount: "abc" })).toThrow(
      RangeError,
    );
  });
});

describe("valuesFromSalon", () => {
  it("shows the stored kobo as naira and an empty image as empty text", () => {
    expect(
      valuesFromSalon({ ...SALON, image_url: null, deposit_amount: 500050 }),
    ).toEqual({
      name: "Pink Studio",
      address: "12 Admiralty Way, Lekki",
      phone: "08012345678",
      image_url: "",
      cancellation_hours: "24",
      deposit_amount: "5000.50",
    });
  });

  it("round-trips through validation and the payload without changing anything", () => {
    const values = valuesFromSalon(SALON);
    expect(validateSalon(values)).toEqual({});
    expect(changedFields(SALON, values)).toEqual({});
  });
});

describe("changedFields (the body for editing)", () => {
  const values = () => valuesFromSalon(SALON);

  it("is empty when nothing changed", () => {
    expect(changedFields(SALON, values())).toEqual({});
  });

  it("sends only the fields that changed", () => {
    expect(changedFields(SALON, { ...values(), name: "New name" })).toEqual({
      name: "New name",
    });
    expect(
      changedFields(SALON, {
        ...values(),
        phone: "0700000000",
        cancellation_hours: "48",
        deposit_amount: "7,500",
      }),
    ).toEqual({
      phone: "0700000000",
      cancellation_hours: 48,
      deposit_amount: 750000,
    });
  });

  it("allows 0 hours (the API accepts it)", () => {
    expect(
      changedFields(SALON, { ...values(), cancellation_hours: "0" }),
    ).toEqual({ cancellation_hours: 0 });
  });

  it("does not count extra spaces as a change", () => {
    expect(
      changedFields(SALON, { ...values(), name: " Pink Studio  " }),
    ).toEqual({});
  });

  it("clears the image with an explicit null when the field is emptied", () => {
    expect(changedFields(SALON, { ...values(), image_url: "" })).toEqual({
      image_url: null,
    });
  });

  it("changes the image when a different link is entered, and does nothing when none was set and none is entered", () => {
    expect(
      changedFields(SALON, {
        ...values(),
        image_url: "https://example.com/b.png",
      }),
    ).toEqual({ image_url: "https://example.com/b.png" });
    const noImage = { ...SALON, image_url: null };
    expect(changedFields(noImage, valuesFromSalon(noImage))).toEqual({});
  });
});

describe("salonServerErrors", () => {
  it("keeps the server's message for the form's own fields", () => {
    expect(
      salonServerErrors({
        name: "String should have at most 100 characters",
        image_url: "String should match pattern",
      }),
    ).toEqual({
      fields: {
        name: "String should have at most 100 characters",
        image_url: "String should match pattern",
      },
      general: null,
    });
  });

  it("says the deposit range in naira instead of the API's kobo message", () => {
    const { fields } = salonServerErrors({
      deposit_amount: "Input should be less than or equal to 100000000",
    });
    expect(fields.deposit_amount).toBe(DEPOSIT_RANGE_MESSAGE);
  });

  it("puts errors for fields the form does not have into one general message", () => {
    expect(
      salonServerErrors({
        owner_id: "Extra inputs are not permitted",
        body: "Field required",
      }),
    ).toEqual({
      fields: {},
      general: "Extra inputs are not permitted Field required",
    });
  });

  it("is empty for no errors", () => {
    expect(salonServerErrors({})).toEqual({ fields: {}, general: null });
  });
});

describe("changedFields with a salon that has no image_url field", () => {
  it("treats a missing image as none, so nothing changes", () => {
    const noField = { ...SALON } as Partial<Salon>;
    delete noField.image_url;
    const salon = noField as Salon;
    expect(changedFields(salon, valuesFromSalon(salon))).toEqual({});
  });
});
