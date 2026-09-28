import { createSlice } from "@reduxjs/toolkit";
import {
  placeOrder,
  getOrders,
  getOrder,
  cancelOrder,
} from "../../services/ordersService.js";
import { serviceThunk } from "../serviceThunk.js";

export const submitOrder = serviceThunk("orders/submitOrder", async (order) =>
  placeOrder(order)
);
export const fetchOrders = serviceThunk("orders/fetchOrders", async () => getOrders());
export const fetchOrder = serviceThunk("orders/fetchOrder", async (id) => getOrder(id));
export const cancelOrderThunk = serviceThunk("orders/cancelOrder", async (id) =>
  cancelOrder(id)
);

function upsert(list, order) {
  const idx = list.findIndex((o) => o.orderId === order.orderId);
  if (idx >= 0) list[idx] = order;
  else list.unshift(order);
}

const ordersSlice = createSlice({
  name: "orders",
  initialState: {
    list: [],
    status: "idle",
    error: null,
    placeStatus: "idle", // separate from `status` so a failed retry doesn't affect the order list view
    placeError: null,
  },
  reducers: {
    resetPlaceStatus: (state) => {
      state.placeStatus = "idle";
      state.placeError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message ?? action.error.message;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        upsert(state.list, action.payload);
      })

      .addCase(submitOrder.pending, (state) => {
        state.placeStatus = "loading";
        state.placeError = null;
      })
      .addCase(submitOrder.fulfilled, (state) => {
        state.placeStatus = "succeeded";
      })
      .addCase(submitOrder.rejected, (state, action) => {
        state.placeStatus = "failed";
        state.placeError = action.payload?.message ?? action.error.message;
      })

      .addCase(cancelOrderThunk.fulfilled, (state, action) => {
        upsert(state.list, action.payload);
      });
  },
});

export const { resetPlaceStatus } = ordersSlice.actions;
export default ordersSlice.reducer;

export const selectOrders = (state) => state.orders.list;
export const selectOrderById = (id) => (state) =>
  state.orders.list.find((o) => o.orderId === id);
export const selectOrdersError = (state) => state.orders.error;
export const selectOrdersStatus = (state) => state.orders.status;
export const selectPlaceOrderStatus = (state) => state.orders.placeStatus;
export const selectPlaceOrderError = (state) => state.orders.placeError;
