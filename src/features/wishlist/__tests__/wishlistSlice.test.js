import { describe, it, expect } from "vitest";
import wishlistReducer, { replaceWishlist } from "../wishlistSlice.js";

describe("wishlistSlice", () => {
  it("should handle initial state", () => {
    expect(wishlistReducer(undefined, { type: "unknown" })).toEqual({ ids: [] });
  });

  it("should replace wishlist ids", () => {
    const state = wishlistReducer({ ids: [] }, replaceWishlist([1, 2, 3]));
    expect(state.ids).toEqual([1, 2, 3]);
  });
});
