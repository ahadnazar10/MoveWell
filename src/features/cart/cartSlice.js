import { createSlice, createSelector } from "@reduxjs/toolkit";
import { readStorage, STORAGE_KEYS, validators } from "../../utils/storage.js";
import { computeTotals } from "../../utils/pricing.js";

/**
 * Cart items hold only { productId, quantity } — never a copy of the product.
 * Prices, titles and stock are read from the product cache at render time, so
 * adding to cart can never change the original product data, and a price
 * change made by a store manager shows up everywhere at once.
 */
const initialItems = readStorage(STORAGE_KEYS.cart, [], validators.cartItems);

function findItem(state, productId) {
  return state.items.find((i) => i.productId === productId);
}

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: initialItems },
  reducers: {
    /** Adds to the cart, merging with an existing line; never above `max` (stock) when given. */
    addItem: (state, action) => {
      const { productId, quantity = 1, max = Infinity } = action.payload;
      const existing = findItem(state, productId);
      const next = Math.min(max, (existing?.quantity ?? 0) + quantity);
      if (next <= 0) return;
      if (existing) existing.quantity = next;
      else state.items.push({ productId, quantity: next });
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    setQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        state.items = state.items.filter((i) => i.productId !== productId);
        return;
      }
      const item = findItem(state, productId);
      if (item) item.quantity = quantity;
    },
    /**
     * +/- buttons dispatch a delta, not "value + 1" computed from a render,
     * so ten rapid clicks always add exactly ten (Level-up L4). Clamped to
     * [1, max]; removal is always an explicit, confirmed action.
     */
    changeQuantity: (state, action) => {
      const { productId, delta, max = Infinity } = action.payload;
      const item = findItem(state, productId);
      if (!item) return;
      item.quantity = Math.max(1, Math.min(max, item.quantity + delta));
    },
    clearCart: (state) => {
      state.items = [];
    },
    /** Rehydrate from another tab's write — dispatched by the cross-tab listener, never by UI. */
    replaceCart: (state, action) => {
      state.items = validators.cartItems(action.payload) ? action.payload : state.items;
    },
  },
});

export const {
  addItem,
  removeItem,
  setQuantity,
  changeQuantity,
  clearCart,
  replaceCart,
} = cartSlice.actions;
export default cartSlice.reducer;

/**
 * Add-to-cart for buttons that don't show a quantity (cards, wishlist).
 * Caps the line at the product's stock and reports what happened, so the
 * caller can say "Added" or "You already have all N".
 *
 * @returns {{ added: number, inCart: number }}
 */
export function addToCart(product, quantity = 1) {
  return (dispatch, getState) => {
    const before =
      getState().cart.items.find((i) => i.productId === product.id)?.quantity ?? 0;
    dispatch(addItem({ productId: product.id, quantity, max: product.stock }));
    const after =
      getState().cart.items.find((i) => i.productId === product.id)?.quantity ?? 0;
    return { added: after - before, inCart: after };
  };
}

/**
 * MoveWell Kits: adds one of each product to the same shared cart, through
 * the same addToCart rule (stock-capped), so a kit is just several ordinary
 * cart lines — no separate bundle cart. Out-of-stock products are skipped.
 *
 * @returns {{ added: string[], skipped: string[] }} product titles
 */
export function addKitToCart(products) {
  return (dispatch) => {
    const added = [];
    const skipped = [];
    for (const product of products) {
      const result = product.stock > 0 ? dispatch(addToCart(product)) : { added: 0 };
      (result.added > 0 ? added : skipped).push(product.title);
    }
    return { added, skipped };
  };
}

export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartQuantity = (productId) => (state) =>
  state.cart.items.find((i) => i.productId === productId)?.quantity ?? 0;

const selectById = (state) => state.products.byId;

/** Cart items joined with their (cached) product. Memoized: recomputed only when either input changes. */
export const selectCartLines = createSelector(
  [selectCartItems, selectById],
  (items, byId) =>
    items.map((item) => ({ ...item, product: byId[item.productId] ?? null }))
);

/** True until every cart product has been loaded into the cache. */
export const selectCartReady = createSelector([selectCartLines], (lines) =>
  lines.every((line) => line.product !== null)
);

export const selectCartTotals = createSelector([selectCartLines], (lines) =>
  computeTotals(lines.filter((line) => line.product))
);
