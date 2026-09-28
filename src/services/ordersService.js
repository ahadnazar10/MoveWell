import { readStorage, writeStorage, STORAGE_KEYS, validators } from "../utils/storage.js";
import { simulate, ServiceError } from "./simulate.js";
import { listAllProducts, decrementStockForOrder } from "./productsService.js";
import { computeTotals } from "../utils/pricing.js";

/** Cancel is allowed only within this window after placedAt, per the brief's table. */
export const CANCEL_WINDOW_MS = 60_000;

function loadOrders() {
  return readStorage(STORAGE_KEYS.orders, [], validators.array);
}
function saveOrders(orders) {
  writeStorage(STORAGE_KEYS.orders, orders);
}

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easier to read aloud

const ID_SPACE = ID_ALPHABET.length ** 6;

/** Six characters from the alphabet, for a number in [0, ID_SPACE). */
function encodeSuffix(n) {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix = ID_ALPHABET[n % ID_ALPHABET.length] + suffix;
    n = Math.floor(n / ID_ALPHABET.length);
  }
  return suffix;
}

/**
 * ORD- plus 6 characters, unique among stored orders. Starts from a random
 * point and steps forward on a collision, so it always terminates (even if
 * Math.random is stubbed to a constant in a test).
 */
function generateOrderId(existingOrders) {
  const taken = new Set(existingOrders.map((o) => o.orderId));
  const n = Math.floor(Math.random() * ID_SPACE);
  for (let attempt = 0; attempt < ID_SPACE; attempt++) {
    const id = `ORD-${encodeSuffix((n + attempt) % ID_SPACE)}`;
    if (!taken.has(id)) return id;
  }
  throw new ServiceError(500, "No order ids left");
}

/**
 * Level-up L7: the service is the final authority on price and stock.
 * An item whose `price` differs from the catalogue's current price, or whose
 * quantity exceeds current stock, rejects the whole order with 409 and a
 * `details` list, so the shopper is never charged a price they did not see
 * and the store never oversells.
 */
function findConflicts(items, products) {
  const conflicts = [];
  for (const item of items) {
    const product = products.find((p) => p.id === Number(item.productId));
    if (!product) {
      conflicts.push({
        productId: item.productId,
        title: item.title,
        reason: "removed",
        available: 0,
      });
    } else if (product.stock < item.quantity) {
      conflicts.push({
        productId: product.id,
        title: product.title,
        reason: "stock",
        requested: item.quantity,
        available: product.stock,
      });
    } else if (typeof item.price === "number" && item.price !== product.price) {
      conflicts.push({
        productId: product.id,
        title: product.title,
        reason: "price",
        seenPrice: item.price,
        currentPrice: product.price,
      });
    }
  }
  return conflicts;
}

/**
 * `order.clientOrderId` is an id the checkout page generates once, before
 * the first placeOrder attempt, and reuses on every retry. That's what makes
 * "the same order can never be placed twice, however many times the shopper
 * clicks" true even though placeOrder fails ~1/3 of the time — see the
 * sequence diagram in docs/architecture.md §4.
 */
export function placeOrder(order) {
  return simulate(
    "placeOrder",
    { order },
    () => {
      const orders = loadOrders();

      const existing = order.clientOrderId
        ? orders.find((o) => o.clientOrderId === order.clientOrderId)
        : null;
      if (existing) {
        return { orderId: existing.orderId, placedAt: existing.placedAt };
      }

      const conflicts = findConflicts(order.items, listAllProducts());
      if (conflicts.length > 0) {
        const first = conflicts[0];
        const message =
          first.reason === "price"
            ? `The price of ${first.title} has changed`
            : `${first.title ?? "An item"} is out of stock`;
        throw new ServiceError(409, message, { conflicts });
      }

      decrementStockForOrder(order.items);
      // Totals are recomputed here from the verified catalogue prices, as a
      // real backend would; totals sent by the page are never trusted.
      const products = listAllProducts();
      const totals = computeTotals(
        order.items.map((item) => ({
          product: products.find((p) => p.id === Number(item.productId)),
          quantity: item.quantity,
        }))
      );
      const orderId = generateOrderId(orders);
      const placedAt = new Date().toISOString();
      const saved = { ...order, ...totals, orderId, placedAt, status: "Placed" };
      saveOrders([saved, ...orders]);
      return { orderId, placedAt };
    },
    { delay: 2000, failureRate: 1 / 3 }
  );
}

export function getOrders() {
  return simulate("getOrders", {}, () =>
    loadOrders()
      .slice()
      .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
  );
}

export function getOrder(id) {
  return simulate("getOrder", { id }, () => {
    const order = loadOrders().find((o) => o.orderId === id);
    if (!order) throw new ServiceError(404, `Order ${id} not found`);
    return order;
  });
}

/** Cancel allowed only within 60s of placedAt, per the brief's table. */
export function cancelOrder(id) {
  return simulate("cancelOrder", { id }, () => {
    const orders = loadOrders();
    const order = orders.find((o) => o.orderId === id);
    if (!order) throw new ServiceError(404, `Order ${id} not found`);
    if (Date.now() - new Date(order.placedAt).getTime() > CANCEL_WINDOW_MS) {
      throw new ServiceError(409, "The 60-second cancel window has passed");
    }
    if (order.status === "Cancelled") return order;
    const updated = { ...order, status: "Cancelled" };
    // Put the units back on the shelf.
    decrementStockForOrder(order.items.map((i) => ({ ...i, quantity: -i.quantity })));
    saveOrders(orders.map((o) => (o.orderId === id ? updated : o)));
    return updated;
  });
}
