import { replaceCart } from "../features/cart/cartSlice.js";
import { replaceWishlist } from "../features/wishlist/wishlistSlice.js";
import { catalogueChanged } from "../features/products/productsSlice.js";
import { replaceGoal } from "../features/profile/profileSlice.js";
import { readStorage, STORAGE_KEYS, validators } from "../utils/storage.js";

const channel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("fitarena") : null;
const storageKey = (key) => `fitarena:${key}`;

/**
 * "One cart, however many tabs" — receiving half of persistenceMiddleware.js.
 * Called once from main.js. Prefers BroadcastChannel; falls back to the
 * native `storage` event (which never fires in the writing tab, only in
 * others — exactly the fallback role it should play). See docs/specs.md §10e.
 *
 * Module 8: a store manager's catalogue change is written to storage by the
 * data service, so the `storage` event is how every other open shop tab
 * learns about it and reloads prices and stock.
 */
export function initCrossTabSync(store) {
  function applyUpdate(key, value) {
    if (key === STORAGE_KEYS.cart) store.dispatch(replaceCart(value));
    if (key === STORAGE_KEYS.wishlist) store.dispatch(replaceWishlist(value));
    if (key === STORAGE_KEYS.fitnessGoal) store.dispatch(replaceGoal(value));
  }

  if (channel) {
    channel.onmessage = (event) => applyUpdate(event.data.key, event.data.value);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey(STORAGE_KEYS.productOverrides) || event.key === null) {
      store.dispatch(catalogueChanged());
    }
    if (event.key === storageKey(STORAGE_KEYS.cart)) {
      applyUpdate(
        STORAGE_KEYS.cart,
        readStorage(STORAGE_KEYS.cart, [], validators.cartItems)
      );
    }
    if (event.key === storageKey(STORAGE_KEYS.fitnessGoal)) {
      applyUpdate(STORAGE_KEYS.fitnessGoal, readStorage(STORAGE_KEYS.fitnessGoal, null));
    }
    if (event.key === storageKey(STORAGE_KEYS.wishlist)) {
      applyUpdate(
        STORAGE_KEYS.wishlist,
        readStorage(STORAGE_KEYS.wishlist, [], validators.idArray)
      );
    }
  });
}
