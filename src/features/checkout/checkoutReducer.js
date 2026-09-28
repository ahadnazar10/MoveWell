import {
  validateAddress,
  validateAddressField,
  validateCard,
  validateCardField,
} from "./checkoutValidation.js";

export const STEPS = ["address", "payment", "review"];
export const STEP_LABELS = { address: "Address", payment: "Payment", review: "Review" };

export const emptyAddress = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  pin: "",
};
const emptyCard = { number: "", expiry: "", cvv: "" };

function newClientOrderId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `client-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/**
 * @param {{ defaultAddressId?: string | null, pin?: string }} [options]
 */
export function createCheckoutState({ defaultAddressId = null, pin = "" } = {}) {
  return {
    step: "address",
    // "new" = typing a new address; otherwise the id of a saved one.
    deliveryAddressId: defaultAddressId ?? "new",
    delivery: { ...emptyAddress, pin },
    saveNewAddress: true,
    billingSameAsDelivery: true,
    billing: { ...emptyAddress },
    paymentMethod: "cod",
    card: { ...emptyCard },
    // Errors are keyed "section.field", e.g. "delivery.email".
    errors: {},
    // Generated once and reused on every retry, so placeOrder is idempotent.
    clientOrderId: newClientOrderId(),
  };
}

function withoutPrefix(errors, prefix) {
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => !key.startsWith(`${prefix}.`))
  );
}

function prefixed(prefix, errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([field, msg]) => [`${prefix}.${field}`, msg])
  );
}

/**
 * Errors for the current step: the delivery address (unless a saved one is
 * chosen), billing (unless "same as delivery"), or the card (only when paying
 * by card). Keyed "section.field".
 */
export function stepErrors(state, step = state.step, now = new Date()) {
  if (step === "address") {
    return {
      ...(state.deliveryAddressId === "new"
        ? prefixed("delivery", validateAddress(state.delivery))
        : {}),
      ...(state.billingSameAsDelivery
        ? {}
        : prefixed("billing", validateAddress(state.billing))),
    };
  }
  if (step === "payment" && state.paymentMethod === "card") {
    return prefixed("card", validateCard(state.card, now));
  }
  return {};
}

/**
 * Module 5 asks for the step flow to be managed with useReducer: moving back
 * and forward never loses input, because every field lives here, not in
 * the step components (which unmount as the shopper moves between steps).
 */
export function checkoutReducer(state, action) {
  switch (action.type) {
    case "goToStep":
      return STEPS.includes(action.step)
        ? { ...state, step: action.step, errors: {} }
        : state;

    case "selectDeliveryAddress":
      return {
        ...state,
        deliveryAddressId: action.id,
        errors: withoutPrefix(state.errors, "delivery"),
      };

    case "editField": {
      const { section, field, value } = action;
      const key = `${section}.${field}`;
      const errors = { ...state.errors };
      delete errors[key]; // typing clears that field's error; blur re-checks it
      return { ...state, [section]: { ...state[section], [field]: value }, errors };
    }

    case "blurField": {
      const { section, field } = action;
      const key = `${section}.${field}`;
      const value = state[section][field];
      const message =
        section === "card"
          ? validateCardField(field, value, action.now)
          : validateAddressField(field, value);
      const errors = { ...state.errors };
      if (message) errors[key] = message;
      else delete errors[key];
      return { ...state, errors };
    }

    case "setErrors":
      return { ...state, errors: action.errors };

    case "setBillingSameAsDelivery":
      return {
        ...state,
        billingSameAsDelivery: action.value,
        errors: action.value ? withoutPrefix(state.errors, "billing") : state.errors,
      };

    case "setSaveNewAddress":
      return { ...state, saveNewAddress: action.value };

    case "setPaymentMethod":
      return {
        ...state,
        paymentMethod: action.method,
        errors:
          action.method === "card" ? state.errors : withoutPrefix(state.errors, "card"),
      };

    case "addressSaved":
      // A new address was saved on continue: from now on, refer to it by id.
      return { ...state, deliveryAddressId: action.id };

    case "loadAddressForEdit":
      return {
        ...state,
        deliveryAddressId: "new",
        delivery: { ...emptyAddress, ...action.address },
      };

    case "clearCard":
      return { ...state, card: { ...emptyCard } };

    default:
      return state;
  }
}
