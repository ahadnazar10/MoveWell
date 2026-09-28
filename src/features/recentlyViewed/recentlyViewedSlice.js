import { createSlice } from "@reduxjs/toolkit";
import { readStorage, STORAGE_KEYS, validators } from "../../utils/storage.js";

const MAX_ITEMS = 5;
const initialIds = readStorage(STORAGE_KEYS.recentlyViewed, [], validators.idArray);

/** Its own small slice — see docs/specs.md §10d for why this isn't sub-state on productsSlice. */
const recentlyViewedSlice = createSlice({
  name: "recentlyViewed",
  initialState: { ids: initialIds },
  reducers: {
    /** Most recent first, no duplicates, at most 5. */
    recordView: (state, action) => {
      const id = Number(action.payload);
      state.ids = [id, ...state.ids.filter((i) => i !== id)].slice(0, MAX_ITEMS);
    },
    forgetView: (state, action) => {
      state.ids = state.ids.filter((i) => i !== Number(action.payload));
    },
  },
});

export const { recordView, forgetView } = recentlyViewedSlice.actions;
export default recentlyViewedSlice.reducer;
export const selectRecentlyViewedIds = (state) => state.recentlyViewed.ids;
