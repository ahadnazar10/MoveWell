import { describe, it, expect } from "vitest";
import {
  validateAddress,
  validateAddressField,
  validateCard,
  validateCardField,
  isFutureExpiry,
} from "../checkoutValidation.js";

const validAddress = {
  name: "Aditi Rao",
  email: "aditi@example.com",
  phone: "9876543210",
  address: "12 MG Road",
  city: "Bengaluru",
  pin: "560001",
};

describe("checkout validation", () => {
  it("accepts a complete, valid address", () => {
    expect(validateAddress(validAddress)).toEqual({});
  });

  it("flags every required field when the address is empty", () => {
    const errors = validateAddress({});
    expect(Object.keys(errors).sort()).toEqual([
      "address",
      "city",
      "email",
      "name",
      "phone",
      "pin",
    ]);
  });

  it.each([
    ["email", "aditi@", "Enter an email like name@example.com"],
    ["email", "aditi example.com", "Enter an email like name@example.com"],
    ["phone", "98765", "Enter a 10-digit phone number"],
    ["phone", "98765432101", "Enter a 10-digit phone number"],
    ["phone", "98765abcde", "Enter a 10-digit phone number"],
    ["pin", "56001", "Enter a 6-digit PIN code"],
    ["pin", "5600011", "Enter a 6-digit PIN code"],
  ])("rejects %s = %j", (field, value, message) => {
    expect(validateAddressField(field, value)).toBe(message);
  });

  it("allows spaces inside a phone number", () => {
    expect(validateAddressField("phone", "98765 43210")).toBe("");
  });

  it("requires a 16-digit card number, ignoring spaces", () => {
    expect(validateCardField("number", "4111 1111 1111 1111")).toBe("");
    expect(validateCardField("number", "4111 1111 1111")).toBe(
      "Enter the 16-digit card number"
    );
  });

  it("requires an expiry that has not passed", () => {
    const now = new Date(2026, 8, 26); // 26 Sep 2026
    expect(isFutureExpiry("09/26", now)).toBe(true); // valid until the month ends
    expect(isFutureExpiry("08/26", now)).toBe(false);
    expect(isFutureExpiry("13/30", now)).toBe(false);
    expect(validateCardField("expiry", "0826", now)).toBe("Use the format MM/YY");
    expect(validateCardField("expiry", "08/26", now)).toBe("This card has expired");
  });

  it("validates a whole card", () => {
    const now = new Date(2026, 8, 26);
    expect(
      validateCard({ number: "4111111111111111", expiry: "12/30", cvv: "123" }, now)
    ).toEqual({});
    expect(Object.keys(validateCard({ number: "", expiry: "", cvv: "1" }, now))).toEqual([
      "number",
      "expiry",
      "cvv",
    ]);
  });
});
