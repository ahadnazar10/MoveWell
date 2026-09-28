/** Indian rupee formatting used everywhere prices are shown — see docs/specs.md §4.1. */
export function formatRupees(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const formatRupee = formatRupees;

export function discountedPrice(price, discountPercentage = 0) {
  return price - (price * discountPercentage) / 100;
}
