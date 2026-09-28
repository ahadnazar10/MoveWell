// The unified MoveWell catalogue (FitArena + StrideHub + MediKart), built by
// scripts/merge-products.mjs — see docs/MERGE.md for the schema.
import productsSeed from "../data/movewell-products.json";
import { KITS } from "../data/kits.js";
import { readStorage, writeStorage, STORAGE_KEYS } from "../utils/storage.js";
import { DEPARTMENT_VALUES, isDepartment } from "../utils/catalogue.js";
import { simulate, ServiceError } from "./simulate.js";
import { devConfig } from "./devConfig.js";

/**
 * Admin creates/edits/deletes are stored as an overlay on top of the
 * read-only seed file, never mutating it — see docs/specs.md §4.4.
 *   byId:       { [id]: product }  — created or edited records
 *   deletedIds: number[]           — seed ids removed by an admin
 *   nextId:     number             — next id to hand out to createProduct
 */
const MAX_SEED_ID = productsSeed.reduce((max, p) => Math.max(max, p.id), 0);

/**
 * Records saved by the pre-MoveWell FitArena admin have `category: "Cricket"`
 * and no subcategory/goals. They are all sports products, so they are read
 * into the unified schema instead of being dropped (docs/CONFLICTS.md).
 */
function normalizeProduct(p) {
  if (isDepartment(p.category) && Array.isArray(p.goals)) return p;
  const legacy = !isDepartment(p.category);
  return {
    ...p,
    category: legacy ? "sports" : p.category.toLowerCase(),
    subcategory: legacy ? p.category : (p.subcategory ?? ""),
    goals: Array.isArray(p.goals) ? p.goals : [],
  };
}

function isOverrides(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.byId === "object" &&
    value.byId !== null &&
    Array.isArray(value.deletedIds) &&
    Number.isInteger(value.nextId)
  );
}

/** A stored product must have the fields every page relies on. */
function isValidProduct(p) {
  return (
    p !== null &&
    typeof p === "object" &&
    Number.isInteger(p.id) &&
    typeof p.title === "string" &&
    typeof p.category === "string" &&
    typeof p.price === "number" &&
    Number.isFinite(p.price) &&
    Number.isInteger(p.stock) &&
    p.stock >= 0
  );
}

function loadOverrides() {
  const overrides = readStorage(
    STORAGE_KEYS.productOverrides,
    { byId: {}, deletedIds: [], nextId: MAX_SEED_ID + 1 },
    isOverrides
  );
  // Drop any individual record that is malformed (e.g. edited in DevTools),
  // so one bad entry can't crash every page that lists it.
  const byId = Object.fromEntries(Object.entries(overrides.byId).filter(([, p]) => isValidProduct(p)));
  return { ...overrides, byId };
}

function saveOverrides(overrides) {
  writeStorage(STORAGE_KEYS.productOverrides, overrides);
}

/**
 * Seed + overlay, merged. Service-internal: other services (orders) use it
 * for current stock and prices. Components never call it — they go through
 * the Promise-returning functions below.
 */
export function listAllProducts() {
  const overrides = loadOverrides();
  const deleted = new Set(overrides.deletedIds);
  const fromSeed = productsSeed
    .filter((p) => !deleted.has(p.id))
    .map((p) => overrides.byId[p.id] ?? p);
  const seedIds = new Set(productsSeed.map((p) => p.id));
  const created = Object.values(overrides.byId).filter(
    (p) => !seedIds.has(p.id) && !deleted.has(p.id)
  );
  return [...fromSeed, ...created].map(normalizeProduct);
}

/** Used internally by ordersService.placeOrder on success — not part of the public table. */
export function decrementStockForOrder(items) {
  const overrides = loadOverrides();
  const all = listAllProducts();
  for (const { productId, quantity } of items) {
    const product = all.find((p) => p.id === Number(productId));
    if (!product) continue;
    overrides.byId[productId] = {
      ...product,
      stock: Math.max(0, product.stock - quantity),
    };
  }
  saveOverrides(overrides);
}

/** "a,b" or ["a","b"] -> ["a","b"] (lower-cased, empties dropped). */
function toList(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  return list.map((v) => v.trim().toLowerCase()).filter(Boolean);
}

/**
 * Sort keys. "" is Relevance: the catalogue's own order, which the filters
 * above preserve (Array.prototype.filter is stable), so switching back to it
 * always restores the original order. "newest" = most recently added, i.e.
 * highest id — the dataset has no date field, and ids only ever grow.
 */
const SORTERS = {
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "rating-desc": (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  newest: (a, b) => b.id - a.id,
};

export const SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating-desc", label: "Rating" },
  { value: "newest", label: "Newest" },
];

/**
 * `category` is a department ("sports" | "footwear" | "health"). Links from
 * before the merge used the old store categories ("?category=Cricket"), so a
 * value that is not a department is matched against `subcategory` instead —
 * the two sets of names never overlap.
 */
function matchesCategory(product, category) {
  const wanted = category.toLowerCase();
  return isDepartment(wanted)
    ? product.category === wanted
    : product.subcategory?.toLowerCase() === wanted;
}

/**
 * Filtering and sorting happen here, in the service, not in components —
 * see the Module 2 entry in docs/ADR.md for why.
 */
export function getProducts({
  q = "",
  category,
  subcategory,
  goal,
  brand,
  minRating,
  minPrice,
  maxPrice,
  sort = "",
  skip = 0,
  limit = 12,
} = {}) {
  const term = q.trim().toLowerCase();
  // Level-up L2: search calls take a random 0 to 2 second delay (adjustable in dev controls).
  const overrides = term
    ? { delay: Math.random() * devConfig.getSnapshot().searchDelayMax }
    : {};

  return simulate(
    "getProducts",
    { q, category, subcategory, goal, brand, minRating, minPrice, maxPrice, sort, skip, limit },
    () => {
      let list = listAllProducts();

      if (category) list = list.filter((p) => matchesCategory(p, category));

      if (subcategory) {
        const wanted = subcategory.toLowerCase();
        list = list.filter((p) => p.subcategory?.toLowerCase() === wanted);
      }

      if (goal) list = list.filter((p) => p.goals.includes(goal));

      const brands = toList(brand);
      if (brands.length > 0) {
        list = list.filter((p) => brands.includes(p.brand?.toLowerCase()));
      }

      if (minRating) {
        list = list.filter((p) => (p.rating ?? 0) >= Number(minRating));
      }

      if (minPrice !== undefined && minPrice !== "") {
        list = list.filter((p) => p.price >= Number(minPrice));
      }

      if (maxPrice !== undefined && maxPrice !== "") {
        list = list.filter((p) => p.price <= Number(maxPrice));
      }

      if (term) {
        list = list.filter(
          (p) =>
            p.title.toLowerCase().includes(term) ||
            p.brand?.toLowerCase().includes(term) ||
            p.subcategory?.toLowerCase().includes(term) ||
            p.category.includes(term) ||
            p.description?.toLowerCase().includes(term)
        );
      }

      if (SORTERS[sort]) list = [...list].sort(SORTERS[sort]);

      return { products: list.slice(skip, skip + limit), total: list.length };
    },
    overrides
  );
}

export function getProduct(id) {
  return simulate("getProduct", { id }, () => {
    const product = listAllProducts().find((p) => p.id === Number(id));
    if (!product) throw new ServiceError(404, `Product ${id} not found`);
    return product;
  });
}

/** The departments that currently have products, in MoveWell's fixed order. */
export function getCategories() {
  return simulate("getCategories", {}, () => {
    const names = new Set(listAllProducts().map((p) => p.category));
    return DEPARTMENT_VALUES.filter((d) => names.has(d));
  });
}

/** Every subcategory name in use ("Cricket", "Sandals", …), for the admin form. */
export function getSubcategories() {
  return simulate("getSubcategories", {}, () => {
    const names = new Set(listAllProducts().map((p) => p.subcategory).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b));
  });
}

/**
 * Department, subcategory and brand names with product counts, for the
 * filter sidebar ("Cricket (10)") and the home page. Counts come from the
 * live catalogue, so an admin edit changes them immediately.
 *
 * Subcategories and brands are scoped to the selected `category` (a
 * department, or a legacy store category), so a shopper browsing Footwear
 * isn't shown cricket brands. Departments are always counted in full.
 */
export function getCatalogueFacets({ category = "" } = {}) {
  return simulate("getCatalogueFacets", { category }, () => {
    const categories = new Map();
    const subcategories = new Map();
    const brands = new Map();
    const all = listAllProducts();
    const department = isDepartment(category)
      ? category.toLowerCase()
      : all.find((p) => category && matchesCategory(p, category))?.category;

    for (const p of all) {
      categories.set(p.category, (categories.get(p.category) ?? 0) + 1);
      if (department && p.category !== department) continue;
      if (p.subcategory) {
        const entry = subcategories.get(p.subcategory) ?? { count: 0, category: p.category };
        entry.count += 1;
        subcategories.set(p.subcategory, entry);
      }
      if (p.brand) brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1);
    }
    const byName = (a, b) => a.name.localeCompare(b.name);
    return {
      categories: DEPARTMENT_VALUES.filter((d) => categories.has(d)).map((name) => ({
        name,
        count: categories.get(name),
      })),
      subcategories: [...subcategories.entries()]
        .map(([name, entry]) => ({ name, ...entry }))
        .sort(byName),
      brands: [...brands.entries()].map(([name, count]) => ({ name, count })).sort(byName),
    };
  });
}

/** In stock first, then highest rated; id breaks ties so results are stable. */
function byRecommendation(a, b) {
  const stockA = a.stock > 0 ? 0 : 1;
  const stockB = b.stock > 0 ? 0 : 1;
  return stockA - stockB || (b.rating ?? 0) - (a.rating ?? 0) || a.id - b.id;
}

/** Takes one product from each department in turn: Sports, Footwear, Health, Sports, … */
function interleaveDepartments(list) {
  const queues = DEPARTMENT_VALUES.map((d) => list.filter((p) => p.category === d));
  const out = [];
  while (queues.some((q) => q.length > 0)) {
    for (const queue of queues) if (queue.length) out.push(queue.shift());
  }
  return out;
}

/**
 * Cross-category picks: with a `goal` ("running" | "gym" | "yoga"), products
 * tagged for that goal from every department; without one, a featured mix.
 * Always interleaves departments so no one store dominates the row.
 */
export function getRecommendations({ goal = "", limit = 8 } = {}) {
  return simulate("getRecommendations", { goal, limit }, () => {
    const pool = listAllProducts()
      .filter((p) => (goal ? p.goals.includes(goal) : p.stock > 0))
      .sort(byRecommendation);
    return { products: interleaveDepartments(pool).slice(0, limit), goal };
  });
}

/**
 * MoveWell Kits (src/data/kits.js) with each slot filled by the best
 * matching product from the live catalogue. A product fills at most one slot
 * per kit; a slot with no match is left out rather than filled with
 * something unrelated.
 */
export function getKits() {
  return simulate("getKits", {}, () => {
    const all = listAllProducts();
    return KITS.map((kit) => {
      const used = new Set();
      const items = [];
      for (const slot of kit.slots) {
        const match = all
          .filter(
            (p) =>
              !used.has(p.id) &&
              p.category === slot.category &&
              p.goals.includes(slot.goal) &&
              (!slot.subcategory || p.subcategory === slot.subcategory)
          )
          .sort(byRecommendation)[0];
        if (!match) continue;
        used.add(match.id);
        items.push({ label: slot.label, product: match });
      }
      return { id: kit.id, name: kit.name, goal: kit.goal, blurb: kit.blurb, items };
    });
  });
}

export function getStock(id) {
  return simulate("getStock", { id }, () => {
    const product = listAllProducts().find((p) => p.id === Number(id));
    if (!product) throw new ServiceError(404, `Product ${id} not found`);
    return { id: product.id, stock: product.stock };
  });
}

/** Fixed 300ms/30%-failure behavior per the brief's table — not the global dev-controls rate. */
export function reserveStock(id, qty) {
  return simulate(
    "reserveStock",
    { id, qty },
    () => {
      const product = listAllProducts().find((p) => p.id === Number(id));
      if (!product) throw new ServiceError(404, `Product ${id} not found`);
      if (product.stock < qty) throw new ServiceError(409, "Not enough stock to reserve");
      return { ok: true };
    },
    { delay: 300, failureRate: 0.3 }
  );
}

export function createProduct(data) {
  return simulate("createProduct", { data }, () => {
    const overrides = loadOverrides();
    // A nextId saved by the pre-merge FitArena build (63, 64, …) is still
    // valid, but must step over the id ranges the merged seed now occupies.
    const taken = new Set(productsSeed.map((p) => p.id));
    let id = overrides.nextId;
    while (taken.has(id)) id += 1;
    const product = normalizeProduct({ goals: [], ...data, id, source: "MoveWell" });
    overrides.byId[id] = product;
    overrides.nextId = id + 1;
    saveOverrides(overrides);
    return product;
  });
}

export function updateProduct(id, data) {
  return simulate("updateProduct", { id, data }, () => {
    const overrides = loadOverrides();
    const existing = listAllProducts().find((p) => p.id === Number(id));
    if (!existing) throw new ServiceError(404, `Product ${id} not found`);
    const updated = { ...existing, ...data, id: Number(id) };
    overrides.byId[id] = updated;
    saveOverrides(overrides);
    return updated;
  });
}

export function deleteProduct(id) {
  return simulate("deleteProduct", { id }, () => {
    const overrides = loadOverrides();
    const numId = Number(id);
    if (!listAllProducts().some((p) => p.id === numId)) {
      throw new ServiceError(404, `Product ${id} not found`);
    }
    if (!overrides.deletedIds.includes(numId)) overrides.deletedIds.push(numId);
    delete overrides.byId[numId];
    saveOverrides(overrides);
    return { id: numId };
  });
}
