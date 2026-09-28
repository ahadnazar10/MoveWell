import { createSlice } from "@reduxjs/toolkit";
import { getReviews, addReview } from "../../services/reviewsService.js";
import { serviceThunk } from "../serviceThunk.js";

export const fetchReviews = serviceThunk("reviews/fetchReviews", async (productId) => ({
  productId,
  reviews: await getReviews(productId),
}));

export const submitReview = serviceThunk(
  "reviews/submitReview",
  async ({ productId, review }) => addReview(productId, review)
);

const reviewsSlice = createSlice({
  name: "reviews",
  initialState: { byProductId: {}, status: {}, submitStatus: "idle", submitError: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state, action) => {
        state.status[action.meta.arg] = "loading";
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.byProductId[action.payload.productId] = action.payload.reviews;
        state.status[action.payload.productId] = "succeeded";
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.status[action.meta.arg] = "failed";
      })

      .addCase(submitReview.pending, (state) => {
        state.submitStatus = "loading";
        state.submitError = null;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.submitStatus = "succeeded";
        const list = state.byProductId[action.payload.productId] ?? [];
        state.byProductId[action.payload.productId] = [action.payload, ...list];
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.submitStatus = "failed";
        state.submitError = action.payload?.message ?? action.error.message;
      });
  },
});

export default reviewsSlice.reducer;
// One shared empty array, so a product with no reviews selects the same
// reference every time and never triggers a needless re-render.
const NO_REVIEWS = [];
export const selectReviewsForProduct = (id) => (state) =>
  state.reviews.byProductId[id] ?? NO_REVIEWS;
export const selectReviewsStatus = (id) => (state) => state.reviews.status[id] ?? "idle";
export const selectSubmitReviewStatus = (state) => state.reviews.submitStatus;
