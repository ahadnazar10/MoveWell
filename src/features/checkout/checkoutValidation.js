/**
 * Checkout validation rules, kept free of React so they can be unit tested
 * and reused for both on-blur (one field) and on-submit (whole step) checks.
 */

export const ADDRESS_FIELDS = ["name", "email", "phone", "address", "city", "pin"];
export const CARD_FIELDS = ["number", "expiry", "cvv"];

export const ADDRESS_LABELS = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  city: "City",
  pin: "PIN code",
};

export const CARD_LABELS = {
  number: "Card number",
  expiry: "Expiry (MM/YY)",
  cvv: "CVV",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

/**
 * "MM/YY" is valid while that month has not ended.
 * @param {string} value
 * @param {Date} now
 */
export function isFutureExpiry(value, now = new Date()) {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const firstOfNextMonth = new Date(year, month, 1);
  return firstOfNextMonth > now;
}

/** @returns {string} an error message, or "" when the value is fine */
export function validateAddressField(field, rawValue) {
  const value = String(rawValue ?? "").trim();
  switch (field) {
    case "name":
      return value ? "" : "Enter your full name";
    case "email":
      if (!value) return "Enter your email address";
      return EMAIL_RE.test(value) ? "" : "Enter an email like name@example.com";
    case "phone":
      if (!value) return "Enter your phone number";
      return /^\d{10}$/.test(value.replace(/\s/g, ""))
        ? ""
        : "Enter a 10-digit phone number";
    case "address":
      return value ? "" : "Enter your street address";
    case "city":
      return value ? "" : "Enter your city";
    case "pin":
      if (!value) return "Enter your PIN code";
      return /^\d{6}$/.test(value) ? "" : "Enter a 6-digit PIN code";
    default:
      return "";
  }
}

export function validateCardField(field, rawValue, now = new Date()) {
  const value = String(rawValue ?? "").trim();
  switch (field) {
    case "number":
      if (!value) return "Enter your card number";
      return /^\d{16}$/.test(value.replace(/[\s-]/g, ""))
        ? ""
        : "Enter the 16-digit card number";
    case "expiry":
      if (!value) return "Enter the expiry date";
      if (!/^\d{2}\s*\/\s*\d{2}$/.test(value)) return "Use the format MM/YY";
      return isFutureExpiry(value, now) ? "" : "This card has expired";
    case "cvv":
      if (!value) return "Enter the CVV";
      return /^\d{3,4}$/.test(value) ? "" : "Enter the 3-digit CVV";
    default:
      return "";
  }
}

/** Errors for a whole address, keyed by field; empty object when valid. */
export function validateAddress(address) {
  const errors = {};
  for (const field of ADDRESS_FIELDS) {
    const message = validateAddressField(field, address?.[field]);
    if (message) errors[field] = message;
  }
  return errors;
}

export function validateCard(card, now = new Date()) {
  const errors = {};
  for (const field of CARD_FIELDS) {
    const message = validateCardField(field, card?.[field], now);
    if (message) errors[field] = message;
  }
  return errors;
}
