import { describe, it, expect } from "vitest";
import cartReducer, {
  addItem,
  removeItem,
  setQuantity,
  changeQuantity,
  clearCart,
  replaceCart,
  selectCartTotals,
} from "../cartSlice.js";

describe("cartSlice", () => {
  it("should handle initial state", () => {
    expect(cartReducer(undefined, { type: "unknown" })).toEqual({ items: [] });
  });

  it("should add a new item", () => {
    const state = cartReducer({ items: [] }, addItem({ productId: 1, quantity: 2 }));
    expect(state.items).toEqual([{ productId: 1, quantity: 2 }]);
  });

  it("should increment quantity if item already exists", () => {
    const initialState = { items: [{ productId: 1, quantity: 2 }] };
    const state = cartReducer(initialState, addItem({ productId: 1, quantity: 3 }));
    expect(state.items).toEqual([{ productId: 1, quantity: 5 }]);
  });

  it("should remove an item", () => {
    const initialState = {
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
    };
    const state = cartReducer(initialState, removeItem(1));
    expect(state.items).toEqual([{ productId: 2, quantity: 1 }]);
  });

  it("should set item quantity", () => {
    const initialState = { items: [{ productId: 1, quantity: 2 }] };
    const state = cartReducer(initialState, setQuantity({ productId: 1, quantity: 5 }));
    expect(state.items).toEqual([{ productId: 1, quantity: 5 }]);
  });

  it("should remove item if setQuantity is 0 or negative", () => {
    const initialState = { items: [{ productId: 1, quantity: 2 }] };
    const state = cartReducer(initialState, setQuantity({ productId: 1, quantity: 0 }));
    expect(state.items).toEqual([]);
  });

  it("adds exactly ten after ten rapid + clicks (Level-up L4)", () => {
    let state = { items: [{ productId: 1, quantity: 1 }] };
    for (let i = 0; i < 10; i++)
      state = cartReducer(state, changeQuantity({ productId: 1, delta: 1, max: 50 }));
    expect(state.items[0].quantity).toBe(11);
  });

  it("keeps + and − within 1 and the available stock", () => {
    let state = { items: [{ productId: 1, quantity: 4 }] };
    state = cartReducer(state, changeQuantity({ productId: 1, delta: 5, max: 5 }));
    expect(state.items[0].quantity).toBe(5);
    state = cartReducer(state, changeQuantity({ productId: 1, delta: -10, max: 5 }));
    expect(state.items[0].quantity).toBe(1);
  });

  it("never changes the product data it points to", () => {
    const product = Object.freeze({ id: 1, price: 100, stock: 3 });
    const state = cartReducer(
      { items: [] },
      addItem({ productId: product.id, quantity: 2 })
    );
    expect(state.items).toEqual([{ productId: 1, quantity: 2 }]);
    expect(product).toEqual({ id: 1, price: 100, stock: 3 });
  });

  it("ignores a malformed cart from another tab", () => {
    const initial = { items: [{ productId: 1, quantity: 2 }] };
    expect(
      cartReducer(initial, replaceCart([{ productId: "x", quantity: -1 }])).items
    ).toEqual(initial.items);
    expect(
      cartReducer(initial, replaceCart([{ productId: 2, quantity: 1 }])).items
    ).toEqual([{ productId: 2, quantity: 1 }]);
  });

  it("derives totals from the cached products", () => {
    const state = {
      cart: { items: [{ productId: 1, quantity: 2 }] },
      products: { byId: { 1: { id: 1, price: 600, discountPercentage: 0 } } },
    };
    expect(selectCartTotals(state)).toMatchObject({
      subtotal: 1200,
      shipping: 0,
      gst: 216,
      total: 1416,
    });
  });

  it("should clear all items in cart", () => {
    const initialState = {
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
    };
    const state = cartReducer(initialState, clearCart());
    expect(state.items).toEqual([]);
  });
});

describe("addToCart (cards and wishlist)", () => {
  it("never adds beyond the product's stock and reports what happened", async () => {
    const { configureStore } = await import("@reduxjs/toolkit");
    const { addToCart } = await import("../cartSlice.js");
    const store = configureStore({ reducer: { cart: cartReducer } });
    const product = { id: 7, stock: 2 };
    expect(store.dispatch(addToCart(product))).toEqual({ added: 1, inCart: 1 });
    expect(store.dispatch(addToCart(product))).toEqual({ added: 1, inCart: 2 });
    expect(store.dispatch(addToCart(product))).toEqual({ added: 0, inCart: 2 });
    expect(store.getState().cart.items).toEqual([{ productId: 7, quantity: 2 }]);
  });
});

describe("addKitToCart (MoveWell Kits)", () => {
  it("adds a cross-category kit as ordinary lines in the one shared cart", async () => {
    const { configureStore } = await import("@reduxjs/toolkit");
    const { addKitToCart } = await import("../cartSlice.js");
    const store = configureStore({
      reducer: { cart: cartReducer },
      preloadedState: { cart: { items: [{ productId: 1001, quantity: 1 }] } },
    });
    const kit = [
      { id: 1001, title: "Running shoe", category: "footwear", stock: 1 }, // already at stock limit
      { id: 57, title: "Track jacket", category: "sports", stock: 5 },
      { id: 2042, title: "Compression socks", category: "health", stock: 3 },
      { id: 2045, title: "First aid kit", category: "health", stock: 0 },
    ];
    expect(store.dispatch(addKitToCart(kit))).toEqual({
      added: ["Track jacket", "Compression socks"],
      skipped: ["Running shoe", "First aid kit"],
    });
    expect(store.getState().cart.items).toEqual([
      { productId: 1001, quantity: 1 },
      { productId: 57, quantity: 1 },
      { productId: 2042, quantity: 1 },
    ]);
  });
});
