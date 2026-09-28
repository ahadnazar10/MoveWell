import { describe, it, expect } from "vitest";
import { checkoutReducer, createCheckoutState, stepErrors } from "../checkoutReducer.js";

const valid = {
  name: "Aditi Rao",
  email: "aditi@example.com",
  phone: "9876543210",
  address: "12 MG Road",
  city: "Bengaluru",
  pin: "560001",
};

function fill(state, section, values) {
  return Object.entries(values).reduce(
    (s, [field, value]) =>
      checkoutReducer(s, { type: "editField", section, field, value }),
    state
  );
}

describe("checkoutReducer", () => {
  it("starts on the address step with a client order id and the header PIN prefilled", () => {
    const state = createCheckoutState({ pin: "400001" });
    expect(state.step).toBe("address");
    expect(state.delivery.pin).toBe("400001");
    expect(state.clientOrderId).toEqual(expect.any(String));
  });

  it("keeps typed input when moving back and forward between steps", () => {
    let state = fill(createCheckoutState(), "delivery", valid);
    state = checkoutReducer(state, { type: "goToStep", step: "payment" });
    state = checkoutReducer(state, { type: "goToStep", step: "address" });
    expect(state.delivery).toEqual(valid);
  });

  it("keeps the same clientOrderId across steps, so retries are idempotent", () => {
    const start = createCheckoutState();
    const later = checkoutReducer(
      checkoutReducer(start, { type: "goToStep", step: "review" }),
      {
        type: "goToStep",
        step: "payment",
      }
    );
    expect(later.clientOrderId).toBe(start.clientOrderId);
  });

  it("validates a field on blur and clears the error as the shopper types", () => {
    let state = checkoutReducer(createCheckoutState(), {
      type: "blurField",
      section: "delivery",
      field: "email",
    });
    expect(state.errors["delivery.email"]).toBe("Enter your email address");
    state = checkoutReducer(state, {
      type: "editField",
      section: "delivery",
      field: "email",
      value: "a",
    });
    expect(state.errors["delivery.email"]).toBeUndefined();
  });

  it("only validates billing when it differs from delivery", () => {
    let state = fill(createCheckoutState(), "delivery", valid);
    expect(stepErrors(state)).toEqual({});
    state = checkoutReducer(state, { type: "setBillingSameAsDelivery", value: false });
    expect(Object.keys(stepErrors(state))).toContain("billing.name");
    state = checkoutReducer(state, { type: "setBillingSameAsDelivery", value: true });
    expect(stepErrors(state)).toEqual({});
  });

  it("skips address validation when a saved address is chosen", () => {
    const state = checkoutReducer(createCheckoutState(), {
      type: "selectDeliveryAddress",
      id: "addr-1",
    });
    expect(stepErrors(state)).toEqual({});
  });

  it("only validates card fields when paying by card", () => {
    let state = checkoutReducer(createCheckoutState(), {
      type: "goToStep",
      step: "payment",
    });
    expect(stepErrors(state)).toEqual({});
    state = checkoutReducer(state, { type: "setPaymentMethod", method: "card" });
    expect(Object.keys(stepErrors(state))).toEqual([
      "card.number",
      "card.expiry",
      "card.cvv",
    ]);
  });

  it("clears card details after the order is placed", () => {
    let state = fill(createCheckoutState(), "card", {
      number: "4111111111111111",
      expiry: "12/30",
      cvv: "123",
    });
    state = checkoutReducer(state, { type: "clearCard" });
    expect(state.card).toEqual({ number: "", expiry: "", cvv: "" });
  });

  it("ignores unknown steps and actions", () => {
    const state = createCheckoutState();
    expect(checkoutReducer(state, { type: "goToStep", step: "nope" })).toBe(state);
    expect(checkoutReducer(state, { type: "unknown" })).toBe(state);
  });
});
