import { createSlice } from "@reduxjs/toolkit";

let nextToastId = 1;

export const TOAST_DURATION_MS = 3000;

/**
 * Callbacks for toasts with an action button (the admin's 5-second Undo).
 * Functions are not serializable, so they live here, keyed by toast id,
 * and Redux only stores the id and label.
 */
const toastHandlers = new Map();

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    toasts: [],
    isCartDrawerOpen: false,
  },
  reducers: {
    showToast: {
      reducer: (state, action) => {
        state.toasts.push(action.payload);
      },
      prepare: (message, variant = "info", options = {}) => ({
        payload: {
          id: nextToastId++,
          message,
          variant,
          duration: options.duration ?? TOAST_DURATION_MS,
          actionLabel: options.actionLabel ?? null,
        },
      }),
    },
    dismissToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    openCartDrawer: (state) => {
      state.isCartDrawerOpen = true;
    },
    closeCartDrawer: (state) => {
      state.isCartDrawerOpen = false;
    },
    toggleCartDrawer: (state) => {
      state.isCartDrawerOpen = !state.isCartDrawerOpen;
    },
  },
});

export const {
  showToast,
  dismissToast,
  openCartDrawer,
  closeCartDrawer,
  toggleCartDrawer,
} = uiSlice.actions;

export default uiSlice.reducer;

/**
 * A toast with one action button. `onAction` runs if the button is pressed;
 * `onExpire` runs if the toast times out or is dismissed without it.
 * Exactly one of the two ever runs.
 */
export function showActionToast(
  message,
  { actionLabel, onAction, onExpire, duration = 5000, variant = "info" }
) {
  return (dispatch) => {
    const action = dispatch(showToast(message, variant, { duration, actionLabel }));
    toastHandlers.set(action.payload.id, { onAction, onExpire });
    return action.payload.id;
  };
}

/** Called by the Toaster when a toast ends. `how` is "action" or "expire". */
export function finishToast(id, how) {
  return (dispatch) => {
    const handlers = toastHandlers.get(id);
    toastHandlers.delete(id);
    dispatch(dismissToast(id));
    if (how === "action") handlers?.onAction?.();
    else handlers?.onExpire?.();
  };
}

export const selectToasts = (state) => state.ui.toasts;
export const selectIsCartDrawerOpen = (state) => state.ui.isCartDrawerOpen;
