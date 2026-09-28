import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getProducts,
  getProduct,
  getCategories,
  getStock,
  getCatalogueFacets,
  getRecommendations,
  getKits,
  reserveStock,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../productsService.js";
import { devConfig } from "../devConfig.js";

describe("productsService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    devConfig.setDelay(0, 0);
    devConfig.setFailureRate(0);
    devConfig.setSearchDelayMax(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getProducts returns a paginated slice and a total count", async () => {
    const { products, total } = await getProducts({ limit: 5 });
    expect(products).toHaveLength(5);
    expect(total).toBeGreaterThan(5);
  });

  it("getProducts filters by department (sports, footwear, health)", async () => {
    for (const category of ["sports", "footwear", "health"]) {
      const { products, total } = await getProducts({ category, limit: 200 });
      expect(total).toBeGreaterThan(0);
      expect(products.every((p) => p.category === category)).toBe(true);
    }
  });

  it("getProducts filters by subcategory, and a legacy ?category=Yoga link still works", async () => {
    const bySub = await getProducts({ category: "sports", subcategory: "Yoga", limit: 100 });
    expect(bySub.total).toBeGreaterThan(0);
    expect(bySub.products.every((p) => p.subcategory === "Yoga")).toBe(true);

    const legacy = await getProducts({ category: "Yoga", limit: 100 });
    expect(legacy.products.map((p) => p.id)).toEqual(bySub.products.map((p) => p.id));
  });

  it("getProducts filters by fitness goal across every department", async () => {
    const { products } = await getProducts({ goal: "running", limit: 200 });
    expect(products.every((p) => p.goals.includes("running"))).toBe(true);
    expect(new Set(products.map((p) => p.category))).toEqual(
      new Set(["sports", "footwear", "health"])
    );
  });

  it("getProducts filters by search term across title/brand/description", async () => {
    const { products } = await getProducts({ q: "cricket bat", limit: 100 });
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => /cricket bat/i.test(p.title))).toBe(true);
  });

  it("getProducts filters by several brands at once", async () => {
    const { products, total } = await getProducts({
      brand: "StrikeZone,ZenMat",
      limit: 100,
    });
    expect(total).toBeGreaterThan(0);
    expect(new Set(products.map((p) => p.brand))).toEqual(
      new Set(["StrikeZone", "ZenMat"])
    );
  });

  it("sorts by newest (highest id first), and Relevance restores the original order", async () => {
    const relevance = await getProducts({ limit: 100 });
    const newest = await getProducts({ sort: "newest", limit: 100 });
    const ids = newest.products.map((p) => p.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
    const again = await getProducts({ sort: "", limit: 100 });
    expect(again.products.map((p) => p.id)).toEqual(relevance.products.map((p) => p.id));
  });

  it("getCatalogueFacets counts departments, subcategories and brands", async () => {
    const { categories, subcategories, brands } = await getCatalogueFacets();
    expect(categories.map((c) => c.name)).toEqual(["sports", "footwear", "health"]);
    const cricket = subcategories.find((c) => c.name === "Cricket");
    const { total } = await getProducts({ subcategory: "Cricket", limit: 1 });
    expect(cricket).toMatchObject({ count: total, category: "sports" });
    expect(brands.length).toBeGreaterThan(0);
  });

  it("getCatalogueFacets scopes types and brands to the chosen department", async () => {
    const { subcategories, brands } = await getCatalogueFacets({ category: "footwear" });
    expect(subcategories.every((s) => s.category === "footwear")).toBe(true);
    expect(brands.some((b) => b.name === "StrikeZone")).toBe(false);
  });

  it("merges all three stores without losing products or reusing an id", async () => {
    const { products, total } = await getProducts({ limit: 1000 });
    expect(total).toBe(62 + 50 + 66);
    expect(new Set(products.map((p) => p.id)).size).toBe(total);
    const strideHub = products.find((p) => p.sourceId === "prod-001");
    expect(strideHub).toMatchObject({ id: 1001, category: "footwear", source: "StrideHub" });
    const mediKart = products.find((p) => p.sourceId === "p-045");
    expect(mediKart).toMatchObject({ id: 2045, category: "health", title: "First Aid Kit" });
  });

  it("reads a pre-merge FitArena admin edit (category: 'Cricket') into the new schema", async () => {
    window.localStorage.setItem(
      "fitarena:productOverrides",
      JSON.stringify({
        byId: { 1: { id: 1, title: "Old edit", category: "Cricket", price: 5, stock: 2 } },
        deletedIds: [],
        nextId: 63,
      })
    );
    await expect(getProduct(1)).resolves.toMatchObject({
      title: "Old edit",
      category: "sports",
      subcategory: "Cricket",
      goals: [],
    });
  });

  it("getRecommendations mixes departments and respects the goal", async () => {
    const { products } = await getRecommendations({ goal: "gym", limit: 6 });
    expect(products.every((p) => p.goals.includes("gym"))).toBe(true);
    expect(products.slice(0, 3).map((p) => p.category)).toEqual([
      "sports",
      "footwear",
      "health",
    ]);
    const featured = await getRecommendations({ limit: 3 });
    expect(new Set(featured.products.map((p) => p.category)).size).toBe(3);
  });

  it("getKits fills every kit from all three departments with in-stock, goal-matched products", async () => {
    const kits = await getKits();
    expect(kits.map((k) => k.id)).toEqual(["marathon-starter", "gym-starter", "yoga-starter"]);
    for (const kit of kits) {
      const departments = new Set(kit.items.map((i) => i.product.category));
      expect(departments).toEqual(new Set(["sports", "footwear", "health"]));
      for (const { product } of kit.items) {
        expect(product.goals).toContain(kit.goal);
        expect(product.stock).toBeGreaterThan(0);
      }
      expect(new Set(kit.items.map((i) => i.product.id)).size).toBe(kit.items.length);
    }
  });

  it("ignores corrupt stored admin edits instead of crashing", async () => {
    window.localStorage.setItem("fitarena:productOverrides", "{not json");
    await expect(getProduct(1)).resolves.toMatchObject({ id: 1 });
    window.localStorage.setItem(
      "fitarena:productOverrides",
      JSON.stringify({ byId: "nope" })
    );
    await expect(getProduct(1)).resolves.toMatchObject({ id: 1 });
    // One malformed product record is ignored; the seed product is used instead.
    window.localStorage.setItem(
      "fitarena:productOverrides",
      JSON.stringify({
        byId: { 1: { id: 1, title: { bad: true }, price: 1, stock: 1 } },
        deletedIds: [],
        nextId: 63,
      })
    );
    await expect(getProduct(1)).resolves.toMatchObject({
      id: 1,
      title: "English Willow Cricket Bat",
    });
  });

  it("getProduct resolves an existing product", async () => {
    const product = await getProduct(1);
    expect(product.id).toBe(1);
  });

  it("getProduct rejects with a 404 ServiceError for a missing id", async () => {
    await expect(getProduct(999999)).rejects.toMatchObject({
      status: 404,
      name: "ServiceError",
    });
  });

  it("getCategories returns the three MoveWell departments in order", async () => {
    expect(await getCategories()).toEqual(["sports", "footwear", "health"]);
  });

  it("getStock reflects the seed product's stock", async () => {
    const product = await getProduct(1);
    const { stock } = await getStock(1);
    expect(stock).toBe(product.stock);
  });

  it("reserveStock succeeds when the simulated failure roll doesn't fire and stock is sufficient", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9); // >= 0.3 failure rate => no simulated failure
    const result = await reserveStock(1, 1);
    expect(result).toEqual({ ok: true });
  });

  it("reserveStock rejects with a 500 ServiceError on the simulated ~30% failure roll", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 0 < 0.3 => simulated failure fires
    await expect(reserveStock(1, 1)).rejects.toMatchObject({ status: 500 });
  });

  it("reserveStock rejects with 409 when the roll passes but stock is insufficient", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    await expect(reserveStock(1, 999999)).rejects.toMatchObject({ status: 409 });
  });

  it("createProduct, updateProduct and deleteProduct persist as a localStorage overlay, seed file untouched", async () => {
    const created = await createProduct({
      title: "Test Product",
      category: "sports",
      subcategory: "Yoga",
      goals: ["yoga"],
      brand: "ZenMat",
      price: 999,
      stock: 10,
      rating: 4,
      specs: {},
      thumbnail: "x",
      images: ["x"],
      description: "test",
    });
    expect(created.id).toBeGreaterThan(0);
    // Never collides with the merged seed's id ranges (1-62, 1001-1050, 2001-2066).
    await expect(getProducts({ limit: 1000 })).resolves.toMatchObject({
      total: 62 + 50 + 66 + 1,
    });

    const updated = await updateProduct(created.id, { price: 1099 });
    expect(updated.price).toBe(1099);

    await deleteProduct(created.id);
    await expect(getProduct(created.id)).rejects.toMatchObject({ status: 404 });

    // Seed file itself is never mutated — product 1 is unaffected.
    const untouched = await getProduct(1);
    expect(untouched.id).toBe(1);
  });
});
