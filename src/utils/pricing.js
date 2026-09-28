/**
 * Every money rule in one place, so the cart page, mini-cart drawer,
 * checkout and order confirmation can never disagree.
 */
export const GST_RATE = 0.18;
export const FREE_SHIPPING_ABOVE = 999;
export const SHIPPING_FEE = 49;
export const LOW_STOCK_BELOW = 5;

/** Round to paise so repeated float maths never shows ₹0.01 drift. */
export function roundPaise(amount) {
  return Math.round(amount * 100) / 100;
}

/**
 * `price` in the dataset is the selling price; `discountPercentage` is how
 * much below the original (MRP) it sits. A missing field and 0 both mean
 * "no discount" (`?? 0`), and only a positive value shows the struck-through
 * original price.
 */
export function hasDiscount(product) {
  return (product?.discountPercentage ?? 0) > 0;
}

export function originalPrice(product) {
  if (!hasDiscount(product)) return product.price;
  return roundPaise(product.price / (1 - product.discountPercentage / 100));
}

export function unitSavings(product) {
  return roundPaise(originalPrice(product) - product.price);
}

export function shippingFor(subtotal) {
  return subtotal === 0 || subtotal > FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;
}

/**
 * @param {{ product: object, quantity: number }[]} lines cart lines whose product is loaded
 */
export function computeTotals(lines) {
  let subtotal = 0;
  let savings = 0;
  let itemCount = 0;
  for (const { product, quantity } of lines) {
    subtotal += product.price * quantity;
    savings += unitSavings(product) * quantity;
    itemCount += quantity;
  }
  subtotal = roundPaise(subtotal);
  const gst = roundPaise(subtotal * GST_RATE);
  const shipping = shippingFor(subtotal);
  return {
    subtotal,
    gst,
    shipping,
    total: roundPaise(subtotal + gst + shipping),
    savings: roundPaise(savings),
    itemCount,
  };
}
