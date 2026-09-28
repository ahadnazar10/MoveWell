import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { simulate, ServiceError } from "../simulate.js";
import { devConfig } from "../devConfig.js";

describe("simulate", () => {
  beforeEach(() => {
    devConfig.setDelay(0, 0);
    devConfig.setFailureRate(0);
    devConfig.clearLog();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves with the wrapped function's return value on success", async () => {
    const result = await simulate("testFn", { a: 1 }, () => ({ ok: true }));
    expect(result).toEqual({ ok: true });
  });

  it("rejects with a ServiceError when the random failure rate fires", async () => {
    devConfig.setFailureRate(1); // Math.random() < 1 is always true
    await expect(simulate("testFn", {}, () => "never reached")).rejects.toBeInstanceOf(
      ServiceError
    );
  });

  it("lets a deterministic ServiceError thrown by fn() pass through unchanged", async () => {
    await expect(
      simulate("testFn", {}, () => {
        throw new ServiceError(404, "not found");
      })
    ).rejects.toMatchObject({ status: 404, message: "not found" });
  });

  it("respects a per-call delay/failureRate override instead of the global config", async () => {
    devConfig.setFailureRate(0); // global says "never fail"...
    await expect(
      simulate("testFn", {}, () => "unreachable", { delay: 0, failureRate: 1 })
    ).rejects.toBeInstanceOf(ServiceError); // ...but the override says "always fail"
  });

  it("logs both successful and failed calls to devConfig", async () => {
    await simulate("okCall", {}, () => "fine");
    await simulate("failCall", {}, () => {
      throw new ServiceError(409, "conflict");
    }).catch(() => {});

    const names = devConfig.getSnapshot().log.map((entry) => entry.name);
    expect(names).toContain("okCall");
    expect(names).toContain("failCall");
  });
});
