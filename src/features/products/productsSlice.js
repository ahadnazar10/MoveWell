import { createSlice } from "@reduxjs/toolkit";
import { serviceThunk } from "../serviceThunk.js";
import {
  getProducts,
  getProduct,
  getCategories,
  getCatalogueFacets,
  getRecommendations,
  getKits,
} from "../../services/productsService.js";

/**
 * Holds only the RESULT of the last catalogue query — never the filter
 * criteria themselves. Filters/sort/pagination live solely in the URL
 * (useSearchParams) — see docs/specs.md §10b for why duplicating them here
 * would be a two-sources-of-truth bug.
 *
 * Module 1: "products and categories load together; the grid appears only
 * when both are ready" — so one thunk awaits both with Promise.all and the
 * grid has a single status to watch.
 */
export const loadCatalogue = serviceThunk("products/loadCatalogue", async (query) => {
  const [page, categories, facets] = await Promise.all([
    getProducts(query),
    getCategories(),
    getCatalogueFacets({ category: query?.category ?? "" }),
  ]);
  return { ...page, categories, facets };
});

/**
 * MoveWell cross-category picks for a fitness goal (or a featured mix when
 * no goal is set). Kept apart from `items` so the home page can show both
 * a goal row and the regular catalogue without one overwriting the other.
 */
export const loadRecommendations = serviceThunk(
  "products/loadRecommendations",
  async ({ goal = "", limit = 8 } = {}) => getRecommendations({ goal, limit })
);

/** MoveWell Kits with their slots resolved against the live catalogue. */
export const loadKits = serviceThunk("products/loadKits", async () => getKits());

/**
 * Skips the service entirely when the product is already cached (Module 3:
 * "if the product was already loaded elsewhere, it appears instantly without
 * calling the service again"). Pass { force: true } to bypass the cache.
 */
export const fetchProduct = serviceThunk(
  "products/fetchProduct",
  async ({ id }) => getProduct(id),
  {
    condition: ({ id, force = false }, { getState }) => {
      if (force) return true;
      const { byId, detailStatus } = getState().products;
      return !byId[id] && detailStatus[id] !== "loading";
    },
  }
);

const initialState = {
  items: [],
  total: 0,
  status: "idle", // idle | loading | succeeded | failed
  error: null,
  lastRequestId: null,

  byId: {}, // product cache keyed by id, filled by every list and detail load
  detailStatus: {},

  categories: [],
  facets: { categories: [], subcategories: [], brands: [] },

  // Results keyed by goal ("" = featured mix), so switching goals back and
  // forth shows the last result instantly while a fresh one loads.
  recommendations: {}, // { [goal]: { ids: number[], status } }
  kits: { items: [], status: "idle" },

  // Bumped whenever the catalogue changes (admin edit here or in another
  // tab); pages include it in their effect dependencies to reload.
  catalogueVersion: 0,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    /** Admin saved a change (this tab or another): drop cached copies and reload. */
    catalogueChanged: (state) => {
      state.byId = {};
      state.detailStatus = {};
      state.catalogueVersion += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCatalogue.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.lastRequestId = action.meta.requestId;
      })
      .addCase(loadCatalogue.fulfilled, (state, action) => {
        // Level-up L2: a response is applied only if it belongs to the
        // latest request. Earlier (slower) searches never touch the screen.
        if (action.meta.requestId !== state.lastRequestId) return;
        const { products, total, categories, facets } = action.payload;
        state.status = "succeeded";
        state.items = products;
        state.total = total;
        state.categories = categories;
        state.facets = facets;
        for (const product of products) {
          state.byId[product.id] = product;
          state.detailStatus[product.id] = "succeeded";
        }
      })
      .addCase(loadCatalogue.rejected, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.status = "failed";
        state.error = action.payload?.message ?? action.error.message;
      })

      .addCase(fetchProduct.pending, (state, action) => {
        state.detailStatus[action.meta.arg.id] = "loading";
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        state.detailStatus[action.payload.id] = "succeeded";
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.detailStatus[action.meta.arg.id] =
          action.payload?.status === 404 ? "notFound" : "failed";
      })

      .addCase(loadRecommendations.pending, (state, action) => {
        const goal = action.meta.arg?.goal ?? "";
        state.recommendations[goal] = {
          ids: state.recommendations[goal]?.ids ?? [],
          status: "loading",
        };
      })
      .addCase(loadRecommendations.fulfilled, (state, action) => {
        const goal = action.meta.arg?.goal ?? "";
        for (const product of action.payload.products) state.byId[product.id] = product;
        state.recommendations[goal] = {
          ids: action.payload.products.map((p) => p.id),
          status: "succeeded",
        };
      })
      .addCase(loadRecommendations.rejected, (state, action) => {
        const goal = action.meta.arg?.goal ?? "";
        state.recommendations[goal] = {
          ids: state.recommendations[goal]?.ids ?? [],
          status: "failed",
        };
      })

      .addCase(loadKits.pending, (state) => {
        state.kits.status = "loading";
      })
      .addCase(loadKits.fulfilled, (state, action) => {
        // Kits keep only ids; the product records go into the shared cache.
        state.kits.items = action.payload.map((kit) => ({
          ...kit,
          items: kit.items.map(({ label, product }) => {
            state.byId[product.id] = product;
            return { label, productId: product.id };
          }),
        }));
        state.kits.status = "succeeded";
      })
      .addCase(loadKits.rejected, (state) => {
        state.kits.status = "failed";
      });
  },
});

export const { catalogueChanged } = productsSlice.actions;
export default productsSlice.reducer;

// Selectors
export const selectProductsList = (state) => state.products.items;
export const selectProductsTotal = (state) => state.products.total;
export const selectProductsStatus = (state) => state.products.status;
export const selectProductsError = (state) => state.products.error;
export const selectCategories = (state) => state.products.categories;
export const selectFacets = (state) => state.products.facets;
export const selectProductsById = (state) => state.products.byId;
export const selectCatalogueVersion = (state) => state.products.catalogueVersion;
export const selectProductById = (id) => (state) => state.products.byId[id];
export const selectProductDetailStatus = (id) => (state) =>
  state.products.detailStatus[id] ?? "idle";

const EMPTY_RECOMMENDATIONS = { ids: [], status: "idle" };
export const selectRecommendations = (goal) => (state) =>
  state.products.recommendations[goal ?? ""] ?? EMPTY_RECOMMENDATIONS;
export const selectKits = (state) => state.products.kits;
