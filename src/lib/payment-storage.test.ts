import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingBookingId,
  readPendingBookingId,
  savePendingBookingId,
} from "./payment-storage";

const ID = "69994867-62d8-480e-b4a6-6f8de65f75c4";

describe("payment-storage", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("saves, reads and clears the booking id", () => {
    expect(readPendingBookingId()).toBeNull();
    expect(savePendingBookingId(ID)).toBe(true);
    expect(readPendingBookingId()).toBe(ID);
    clearPendingBookingId();
    expect(readPendingBookingId()).toBeNull();
  });

  it("ignores a saved value that is not a booking id", () => {
    window.sessionStorage.setItem("sb_pending_booking", "../../admin");
    expect(readPendingBookingId()).toBeNull();
    window.sessionStorage.setItem("sb_pending_booking", `${ID}/extra`);
    expect(readPendingBookingId()).toBeNull();
  });

  it("does not throw when sessionStorage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(savePendingBookingId(ID)).toBe(false);
    expect(readPendingBookingId()).toBeNull();
    expect(() => clearPendingBookingId()).not.toThrow();
  });
});
