export const ORDER_STEPS = ["Placed", "Packed", "Shipped", "Delivered"];
export const STEP_INTERVAL_MS = 20_000;
export const CANCEL_WINDOW_MS = 60_000;

/**
 * Status is never stored — it is derived from how long ago the order was
 * placed, so it is right after a refresh or when opened hours later.
 *
 * @returns {{ status: string, stepIndex: number, cancelSecondsLeft: number }}
 */
export function deriveOrderStatus(order, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(order.placedAt).getTime());
  if (order.status === "Cancelled") {
    return { status: "Cancelled", stepIndex: -1, cancelSecondsLeft: 0 };
  }
  const stepIndex = Math.min(
    ORDER_STEPS.length - 1,
    Math.floor(elapsed / STEP_INTERVAL_MS)
  );
  return {
    status: ORDER_STEPS[stepIndex],
    stepIndex,
    cancelSecondsLeft: Math.max(0, Math.ceil((CANCEL_WINDOW_MS - elapsed) / 1000)),
  };
}
