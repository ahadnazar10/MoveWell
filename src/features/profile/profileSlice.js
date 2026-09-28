import { createSlice } from "@reduxjs/toolkit";
import { readStorage, STORAGE_KEYS, validators } from "../../utils/storage.js";
import { GOAL_VALUES } from "../../utils/catalogue.js";

/**
 * MoveWell Fitness Goal Profile: the shopper's chosen goal ("running" |
 * "gym" | "yoga", or null for none). Redux rather than Context because it is
 * shop state that drives data loading (recommendations, kits) from several
 * unrelated pages, and it persists and syncs across tabs exactly like the
 * cart — through the same persistenceMiddleware (docs/specs.md §3).
 */
const initialGoal = readStorage(
  STORAGE_KEYS.fitnessGoal,
  null,
  validators.oneOf([null, ...GOAL_VALUES])
);

const profileSlice = createSlice({
  name: "profile",
  initialState: { goal: initialGoal },
  reducers: {
    setGoal: (state, action) => {
      state.goal = GOAL_VALUES.includes(action.payload) ? action.payload : null;
    },
    clearGoal: (state) => {
      state.goal = null;
    },
    /** Rehydrate from another tab's write — dispatched by crossTabSync, never by UI. */
    replaceGoal: (state, action) => {
      state.goal = GOAL_VALUES.includes(action.payload) ? action.payload : null;
    },
  },
});

export const { setGoal, clearGoal, replaceGoal } = profileSlice.actions;
export default profileSlice.reducer;

export const selectFitnessGoal = (state) => state.profile.goal;
