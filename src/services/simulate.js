import { devConfig } from "./devConfig.js";

/**
 * The shape every failed service call rejects with — status is 404, 409, or
 * 500. `details` optionally carries structured data the UI needs to recover
 * (for example, which cart items are short on stock).
 */
export class ServiceError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.random() * (hi - lo);
}

/**
 * Wraps every data-service function with the shared delay + random-failure
 * simulation and call-log recording described in docs/specs.md §4.2.
 *
 * @param {string} name         function name, for the dev-controls call log
 * @param {object} args         arguments, for the dev-controls call log
 * @param {() => any} fn        the real (synchronous or async) logic; may itself
 *                               throw ServiceError for deterministic errors (404, 409)
 * @param {object} [overrides]  per-call overrides, for functions with their own
 *                               fixed behavior (reserveStock: 300ms/30%; placeOrder:
 *                               2s/~33%) instead of the global dev-controls config
 */
export async function simulate(name, args, fn, overrides = {}) {
  const cfg = devConfig.getSnapshot();
  const delayMs = overrides.delay ?? randomDelay(cfg.delayMin, cfg.delayMax);
  const failureRate = overrides.failureRate ?? cfg.failureRate;

  const start = performance.now();
  await wait(delayMs);

  try {
    if (Math.random() < failureRate) {
      throw new ServiceError(500, `${name} failed (simulated)`);
    }
    const result = await fn();
    devConfig.logCall({
      name,
      args,
      duration: Math.round(performance.now() - start),
      result: "ok",
    });
    return result;
  } catch (err) {
    devConfig.logCall({
      name,
      args,
      duration: Math.round(performance.now() - start),
      result: "error",
      status: err instanceof ServiceError ? err.status : 500,
    });
    throw err;
  }
}
