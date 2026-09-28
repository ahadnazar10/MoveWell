import { readStorage, writeStorage, STORAGE_KEYS, validators } from "../utils/storage.js";
import { simulate, ServiceError } from "./simulate.js";

/** Reviews keyed by productId: { [productId]: Review[] } */
function loadReviews() {
  return readStorage(STORAGE_KEYS.reviews, {}, validators.plainObject);
}
function saveReviews(all) {
  writeStorage(STORAGE_KEYS.reviews, all);
}

export function getReviews(productId) {
  return simulate("getReviews", { productId }, () => {
    const all = loadReviews();
    const reviews = all[productId] ?? [];
    return reviews.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });
}

/** One review per shopper per product — enforced here, not just in the UI. */
export function addReview(productId, review) {
  return simulate("addReview", { productId, review }, () => {
    const all = loadReviews();
    const existing = all[productId] ?? [];
    if (!review.shopperId || existing.some((r) => r.shopperId === review.shopperId)) {
      throw new ServiceError(409, "You've already reviewed this product");
    }
    const saved = {
      ...review,
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      productId: Number(productId),
      createdAt: new Date().toISOString(),
    };
    all[productId] = [...existing, saved];
    saveReviews(all);
    return saved;
  });
}
