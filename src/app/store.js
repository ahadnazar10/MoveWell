import { configureStore } from "@reduxjs/toolkit";
import productsReducer from "../features/products/productsSlice.js";
import cartReducer from "../features/cart/cartSlice.js";
import wishlistReducer from "../features/wishlist/wishlistSlice.js";
import recentlyViewedReducer from "../features/recentlyViewed/recentlyViewedSlice.js";
import ordersReducer from "../features/orders/ordersSlice.js";
import reviewsReducer from "../features/reviews/reviewsSlice.js";
import addressesReducer from "../features/addresses/addressesSlice.js";
import uiReducer from "../features/ui/uiSlice.js";
import profileReducer from "../features/profile/profileSlice.js";
import { persistenceMiddleware } from "./persistenceMiddleware.js";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    recentlyViewed: recentlyViewedReducer,
    orders: ordersReducer,
    reviews: reviewsReducer,
    addresses: addressesReducer,
    ui: uiReducer,
    profile: profileReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(persistenceMiddleware),
});
