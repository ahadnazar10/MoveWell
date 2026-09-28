import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { readStorage, STORAGE_KEYS, validators } from "../../utils/storage.js";
import { simulate } from "../../services/simulate.js";

const initialIds = readStorage(STORAGE_KEYS.wishlist, [], validators.idArray);

/**
 * Optimistic toggle, Redux-native — see docs/specs.md §10a for why this is
 * used instead of React 19's `useOptimistic`. The wishlist is Redux state
 * toggled from three places (card, detail page, wishlist page); a plain
 * reducer flip + thunk reconciliation is one mental model instead of two.
 * Routed through the shared `simulate()` helper (global dev-controls delay/
 * failure rate) so cranking the failure rate up in Developer Controls is
 * exactly how you demo the rollback + toast live.
 */
const syncWishlistToggle = createAsyncThunk(
  "wishlist/syncToggle",
  async ({ productId, nextState }) =>
    simulate("toggleWishlist", { productId, nextState }, () => ({ productId, nextState }))
);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: { ids: initialIds },
  reducers: {
    _flip: (state, action) => {
      const id = action.payload;
      state.ids = state.ids.includes(id)
        ? state.ids.filter((i) => i !== id)
        : [...state.ids, id];
    },
    replaceWishlist: (state, action) => {
      if (validators.idArray(action.payload)) state.ids = action.payload;
    },
  },
});

const { _flip, replaceWishlist } = wishlistSlice.actions;
export { replaceWishlist };
export default wishlistSlice.reducer;

export const selectWishlistIds = (state) => state.wishlist.ids;
export const selectIsWishlisted = (id) => (state) =>
  state.wishlist.ids.includes(Number(id));

/**
 * The only way components should toggle the wishlist. Flips immediately
 * (optimistic), then reconciles: on failure it flips back and rejects, so
 * the calling component can show a toast without uiSlice needing to know
 * wishlist-specific copy.
 */
export function toggleWishlist(rawProductId) {
  const productId = Number(rawProductId);
  return async (dispatch, getState) => {
    const wasWishlisted = getState().wishlist.ids.includes(productId);
    dispatch(_flip(productId));
    try {
      await dispatch(
        syncWishlistToggle({ productId, nextState: !wasWishlisted })
      ).unwrap();
    } catch (err) {
      dispatch(_flip(productId)); // revert
      throw err;
    }
  };
}
