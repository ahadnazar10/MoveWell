import { describe, it, expect } from "vitest";
import { computeTotals, originalPrice, hasDiscount, shippingFor } from "../pricing.js";
import { addWorkingDays, deliveryPromise } from "../delivery.js";
import { deriveOrderStatus } from "../orderStatus.js";
import { formatRupee } from "../rupee.js";

describe("pricing", () => {
  it("treats a missing discount field and a 0 discount the same", () => {
    expect(hasDiscount({ price: 100 })).toBe(false);
    expect(hasDiscount({ price: 100, discountPercentage: 0 })).toBe(false);
    expect(originalPrice({ price: 100 })).toBe(100);
    expect(originalPrice({ price: 80, discountPercentage: 20 })).toBe(100);
  });

  it("charges ₹49 shipping at or below ₹999 and nothing above", () => {
    expect(shippingFor(0)).toBe(0);
    expect(shippingFor(999)).toBe(49);
    expect(shippingFor(999.01)).toBe(0);
  });

  it("adds 18% GST, shipping and savings, rounded to paise", () => {
    const totals = computeTotals([
      { product: { price: 19.99 }, quantity: 3 },
      { product: { price: 80, discountPercentage: 20 }, quantity: 1 },
    ]);
    expect(totals).toEqual({
      subtotal: 139.97,
      gst: 25.19,
      shipping: 49,
      total: 214.16,
      savings: 20,
      itemCount: 4,
    });
  });

  it("formats rupees Indian-style with two decimals", () => {
    expect(formatRupee(1299.5)).toBe("₹1,299.50");
    expect(formatRupee(123456.789)).toBe("₹1,23,456.79");
  });
});

describe("delivery date", () => {
  it("counts 3 working days, skipping the weekend", () => {
    const thursday = new Date(2026, 8, 24);
    expect(addWorkingDays(thursday, 3).toDateString()).toBe(
      new Date(2026, 8, 29).toDateString()
    ); // Tue
    const saturday = new Date(2026, 8, 26);
    expect(addWorkingDays(saturday, 3).toDateString()).toBe(
      new Date(2026, 8, 30).toDateString()
    ); // Wed
  });

  it("builds the shopper-facing sentence", () => {
    expect(deliveryPromise("400001", new Date(2026, 8, 24))).toMatch(
      /^Delivers to 400001 by Tue, 29 Sept?/
    );
  });
});

describe("order status by elapsed time", () => {
  const placedAt = new Date(2026, 0, 1, 10, 0, 0).toISOString();
  const at = (seconds) => new Date(placedAt).getTime() + seconds * 1000;

  it("moves one step every 20 seconds and stops at Delivered", () => {
    expect(deriveOrderStatus({ placedAt }, at(0)).status).toBe("Placed");
    expect(deriveOrderStatus({ placedAt }, at(20)).status).toBe("Packed");
    expect(deriveOrderStatus({ placedAt }, at(40)).status).toBe("Shipped");
    expect(deriveOrderStatus({ placedAt }, at(60)).status).toBe("Delivered");
    expect(deriveOrderStatus({ placedAt }, at(3 * 3600)).status).toBe("Delivered"); // hours later
  });

  it("offers cancel only during the first 60 seconds", () => {
    expect(deriveOrderStatus({ placedAt }, at(1)).cancelSecondsLeft).toBe(59);
    expect(deriveOrderStatus({ placedAt }, at(60)).cancelSecondsLeft).toBe(0);
  });

  it("reports a cancelled order as cancelled", () => {
    expect(deriveOrderStatus({ placedAt, status: "Cancelled" }, at(30)).status).toBe(
      "Cancelled"
    );
  });
});

describe("safeReturnPath (sign-in ?from=)", () => {
  it("keeps same-app paths", async () => {
    const { safeReturnPath } = await import("../safeReturnPath.js");
    expect(safeReturnPath("/admin?edit=3")).toBe("/admin?edit=3");
  });

  it("refuses anything that could leave the site", async () => {
    const { safeReturnPath } = await import("../safeReturnPath.js");
    const backslash = String.fromCharCode(92);
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      `/${backslash}evil.example`,
      "admin",
      null,
    ]) {
      expect(safeReturnPath(bad)).toBe("/admin");
    }
  });
});
