// Kept as "fitarena:" after the MoveWell merge so carts, orders and
// addresses saved by the FitArena build are not lost (docs/CONFLICTS.md).
const PREFIX = "fitarena:";

export const STORAGE_KEYS = {
  fitnessGoal: "fitnessGoal",
  cart: "cart",
  wishlist: "wishlist",
  recentlyViewed: "recentlyViewed",
  orders: "orders",
  reviews: "reviews",
  addresses: "addresses",
  productOverrides: "productOverrides",
  theme: "theme",
  deliveryPin: "deliveryPin",
  role: "role",
  shopperId: "shopperId",
};

/**
 * Read a JSON value from localStorage, falling back safely if it is missing,
 * corrupt, or (when `validate` is given) the wrong shape. Stored data is
 * user-editable in DevTools, so it is never trusted blindly (docs/SECURITY.md).
 *
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @param {(value: unknown) => boolean} [validate]
 * @returns {T}
 */
export function readStorage(key, fallback, validate) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    if (validate && !validate(value)) return fallback;
    return value;
  } catch {
    return fallback;
  }
}

/** Shape checks used with readStorage. */
export const validators = {
  idArray: (v) => Array.isArray(v) && v.every((id) => Number.isInteger(id) && id > 0),
  cartItems: (v) =>
    Array.isArray(v) &&
    v.every(
      (i) =>
        i &&
        Number.isInteger(i.productId) &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0 &&
        i.quantity <= 999
    ),
  array: (v) => Array.isArray(v),
  plainObject: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  oneOf: (options) => (v) => options.includes(v),
  pin: (v) => v === "" || /^\d{6}$/.test(v),
};

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private browsing) or full — the app still
    // works, it just won't persist between visits.
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Developer-controls "reset all stored data" — clears every fitarena: key. */
export function resetAllStoredData() {
  try {
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
