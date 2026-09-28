import { useCallback, useEffect } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { fetchProduct } from "../features/products/productsSlice.js";

/**
 * Loads (through the data service) any of `ids` not yet in the product cache,
 * and returns what is known about each. The cart, mini-cart drawer, checkout,
 * wishlist and Recently viewed all hold only product ids and all needed this
 * same "fetch whatever is missing" effect.
 *
 * @param {number[]} ids
 * @returns {{
 *   products: Record<number, object>,
 *   missingIds: number[],   // not found (deleted by a store manager)
 *   status: "loading" | "ready" | "failed",
 *   retry: () => void,
 * }}
 */
export function useProductsByIds(ids) {
  const dispatch = useDispatch();
  const catalogueVersion = useSelector((state) => state.products.catalogueVersion);

  const products = useSelector((state) => {
    const found = {};
    for (const id of ids) {
      const product = state.products.byId[id];
      if (product) found[id] = product;
    }
    return found;
  }, shallowEqual);

  const statuses = useSelector(
    (state) => ids.map((id) => state.products.detailStatus[id] ?? "idle"),
    shallowEqual
  );

  const idsKey = ids.join(",");

  useEffect(() => {
    for (const id of idsKey ? idsKey.split(",").map(Number) : []) {
      dispatch(fetchProduct({ id })); // no-op when cached or already loading
    }
  }, [dispatch, idsKey, catalogueVersion]);

  const retry = useCallback(() => {
    ids.forEach((id, i) => {
      if (statuses[i] === "failed") dispatch(fetchProduct({ id, force: true }));
    });
  }, [dispatch, ids, statuses]);

  const missingIds = ids.filter((_, i) => statuses[i] === "notFound");
  const pending = ids.some(
    (id, i) => !products[id] && statuses[i] !== "notFound" && statuses[i] !== "failed"
  );
  const failed = statuses.includes("failed");

  return {
    products,
    missingIds,
    status: failed ? "failed" : pending ? "loading" : "ready",
    retry,
  };
}
