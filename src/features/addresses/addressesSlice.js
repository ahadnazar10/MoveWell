import { createSlice } from "@reduxjs/toolkit";
import { serviceThunk } from "../serviceThunk.js";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../../services/addressesService.js";

export const fetchAddresses = serviceThunk("addresses/fetch", async () => getAddresses());
export const addAddress = serviceThunk("addresses/add", async (data) =>
  createAddress(data)
);
export const editAddress = serviceThunk("addresses/edit", async ({ id, data }) =>
  updateAddress(id, data)
);
export const removeAddress = serviceThunk("addresses/remove", async (id) =>
  deleteAddress(id)
);

const addressesSlice = createSlice({
  name: "addresses",
  initialState: { list: [], status: "idle" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchAddresses.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(addAddress.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(editAddress.fulfilled, (state, action) => {
        const idx = state.list.findIndex((a) => a.id === action.payload.id);
        if (idx >= 0) state.list[idx] = action.payload;
      })
      .addCase(removeAddress.fulfilled, (state, action) => {
        state.list = state.list.filter((a) => a.id !== action.payload.id);
      });
  },
});

export default addressesSlice.reducer;
export const selectAddresses = (state) => state.addresses.list;
export const selectAddressesStatus = (state) => state.addresses.status;
