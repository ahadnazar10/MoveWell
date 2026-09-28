import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { placeOrder, getOrders, cancelOrder } from "../ordersService.js";
import { getStock } from "../productsService.js";
import { readStorage, writeStorage, STORAGE_KEYS } from "../../utils/storage.js";

/** placeOrder has a fixed 2000ms delay regardless of dev-controls config — fake timers keep this fast. */
async function placeOrderFast(order) {
  vi.useFakeTimers();
  const promise = placeOrder(order);
  promise.catch(() => {}); // avoid a spurious "unhandled rejection" before the caller's own .rejects attaches
  await vi.advanceTimersByTimeAsync(2100);
  vi.useRealTimers();
  return promise;
}

describe("ordersService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("placeOrder succeeds, decrements stock, and returns an ORD-xxxxxx id", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9); // bypass the ~1/3 simulated failure
    const before = await getStock(1);

    const result = await placeOrderFast({
      clientOrderId: "client-1",
      items: [{ productId: 1, quantity: 1, title: "Test" }],
      total: 100,
    });

    expect(result.orderId).toMatch(/^ORD-/);
    const after = await getStock(1);
    expect(after.stock).toBe(before.stock - 1);
  });

  it("is idempotent: the same clientOrderId never places (or decrements stock) twice", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const before = await getStock(2);

    const first = await placeOrderFast({
      clientOrderId: "same-client-id",
      items: [{ productId: 2, quantity: 1, title: "Test" }],
      total: 100,
    });
    const second = await placeOrderFast({
      clientOrderId: "same-client-id",
      items: [{ productId: 2, quantity: 1, title: "Test" }],
      total: 100,
    });

    expect(second.orderId).toBe(first.orderId);
    const after = await getStock(2);
    expect(after.stock).toBe(before.stock - 1); // decremented once, not twice
  });

  it("rejects with 409 when an item doesn't have enough stock", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    await expect(
      placeOrderFast({
        clientOrderId: "client-oos",
        items: [{ productId: 3, quantity: 999999, title: "Test" }],
        total: 100,
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects with 409 and the changed price when the shopper saw an old price (L7)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    await expect(
      placeOrderFast({
        clientOrderId: "stale-price",
        items: [{ productId: 3, quantity: 1, title: "Pads", price: 1 }],
      })
    ).rejects.toMatchObject({
      status: 409,
      details: {
        conflicts: [
          expect.objectContaining({ productId: 3, reason: "price", seenPrice: 1 }),
        ],
      },
    });
  });

  it("recomputes totals from catalogue prices instead of trusting the page", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const { orderId } = await placeOrderFast({
      clientOrderId: "totals-check",
      items: [{ productId: 5, quantity: 1, title: "Helmet" }],
      subtotal: 1,
      total: 1,
    });
    const saved = readStorage(STORAGE_KEYS.orders, []).find((o) => o.orderId === orderId);
    expect(saved.subtotal).toBeGreaterThan(1);
    expect(saved.total).toBeCloseTo(saved.subtotal + saved.gst + saved.shipping, 2);
  });

  it("cancelling puts the stock back", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const before = await getStock(4);
    const { orderId } = await placeOrderFast({
      clientOrderId: "cancel-restock",
      items: [{ productId: 4, quantity: 2, title: "Gloves" }],
    });
    await cancelOrder(orderId);
    expect((await getStock(4)).stock).toBe(before.stock);
  });

  it("getOrders returns placed orders, most recent first", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    await placeOrderFast({
      clientOrderId: "c1",
      items: [{ productId: 4, quantity: 1, title: "Test" }],
      total: 50,
    });
    await placeOrderFast({
      clientOrderId: "c2",
      items: [{ productId: 5, quantity: 1, title: "Test" }],
      total: 50,
    });
    const orders = await getOrders();
    expect(orders.length).toBeGreaterThanOrEqual(2);
    expect(new Date(orders[0].placedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(orders[1].placedAt).getTime()
    );
  });

  it("cancelOrder succeeds inside the 60s window", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const { orderId } = await placeOrderFast({
      clientOrderId: "cancel-me",
      items: [{ productId: 6, quantity: 1, title: "Test" }],
      total: 50,
    });
    const cancelled = await cancelOrder(orderId);
    expect(cancelled.status).toBe("Cancelled");
  });

  it("cancelOrder rejects with 409 once the 60s window has passed", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const { orderId } = await placeOrderFast({
      clientOrderId: "too-late",
      items: [{ productId: 7, quantity: 1, title: "Test" }],
      total: 50,
    });

    // Backdate the order past the cancel window directly in storage.
    const orders = readStorage(STORAGE_KEYS.orders, []);
    const backdated = orders.map((o) =>
      o.orderId === orderId
        ? { ...o, placedAt: new Date(Date.now() - 61_000).toISOString() }
        : o
    );
    writeStorage(STORAGE_KEYS.orders, backdated);

    await expect(cancelOrder(orderId)).rejects.toMatchObject({ status: 409 });
  });
});
