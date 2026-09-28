import { createAsyncThunk } from "@reduxjs/toolkit";

/**
 * createAsyncThunk, but a rejected ServiceError keeps its `status` (404, 409,
 * 500) and `details`. Plain createAsyncThunk serializes errors down to
 * { name, message, stack }, so the UI could not tell "not found" from
 * "service failed" or read which cart items conflicted.
 *
 * Rejected actions carry the error in `action.payload`, and `.unwrap()`
 * rejects with that same { status, message, details } object.
 */
export function serviceThunk(type, run, options) {
  return createAsyncThunk(
    type,
    async (arg, thunkApi) => {
      try {
        return await run(arg, thunkApi);
      } catch (err) {
        return thunkApi.rejectWithValue({
          status: err?.status ?? 500,
          message: err?.message ?? "Something went wrong",
          details: err?.details,
        });
      }
    },
    options
  );
}
