import { writeStorage, STORAGE_KEYS } from "../utils/storage.js";

/**
 * The one hand-written `(store) => (next) => (action) => {}` Redux middleware
 * the brief asks for by name (docs/specs.md §3.2). Debounce-writes cart,
 * wishlist and Recently viewed to localStorage, and re-broadcasts to other
 * tabs via BroadcastChannel (crossTabSync.js on the receiving end) — see
 * docs/specs.md §10e for why BroadcastChannel is preferred over relying
 * solely on the native `storage` event.
 *
 * Debouncing batches bursts (ten rapid "+" clicks = one write). Any write
 * still waiting is flushed when the page is hidden or unloaded, so adding to
 * the cart and refreshing straight away never loses the change.
 */
const channel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("fitarena") : null;

const DEBOUNCE_MS = 150;
const timers = {};
const pending = {}; // key -> () => value, for writes not yet done

function write(key) {
  const getValue = pending[key];
  if (!getValue) return;
  delete pending[key];
  clearTimeout(timers[key]);
  const value = getValue();
  writeStorage(key, value);
  channel?.postMessage({ key, value });
}

function debouncedPersist(key, getValue) {
  pending[key] = getValue;
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => write(key), DEBOUNCE_MS);
}

export function flushPendingWrites() {
  Object.keys(pending).forEach(write);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPendingWrites);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingWrites();
  });
}

export const persistenceMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  if (action.type.startsWith("cart/") && action.type !== "cart/replaceCart") {
    debouncedPersist(STORAGE_KEYS.cart, () => store.getState().cart.items);
  }

  if (action.type.startsWith("wishlist/") && action.type !== "wishlist/replaceWishlist") {
    debouncedPersist(STORAGE_KEYS.wishlist, () => store.getState().wishlist.ids);
  }

  if (action.type.startsWith("profile/") && action.type !== "profile/replaceGoal") {
    debouncedPersist(STORAGE_KEYS.fitnessGoal, () => store.getState().profile.goal);
  }

  if (action.type.startsWith("recentlyViewed/")) {
    debouncedPersist(
      STORAGE_KEYS.recentlyViewed,
      () => store.getState().recentlyViewed.ids
    );
  }

  return result;
};
