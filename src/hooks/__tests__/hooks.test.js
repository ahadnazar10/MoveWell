import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "../useDebouncedValue.js";
import { useMinimumDelay, MINIMUM_LOADER_MS } from "../useMinimumDelay.js";
import { useOnlineStatus } from "../useOnlineStatus.js";

// Timer-based hooks are tested with fake timers: no real waiting.
describe("custom hooks", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe("useDebouncedValue", () => {
    it("only reports a value once it has stopped changing for the delay", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        {
          initialProps: { value: "c" },
        }
      );
      rerender({ value: "cr" });
      rerender({ value: "cri" });
      act(() => vi.advanceTimersByTime(299));
      expect(result.current).toBe("c");
      act(() => vi.advanceTimersByTime(1));
      expect(result.current).toBe("cri");
    });

    it("restarts the wait on every change (one search per pause, not per keystroke)", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        {
          initialProps: { value: "" },
        }
      );
      for (const value of ["b", "ba", "bat"]) {
        rerender({ value });
        act(() => vi.advanceTimersByTime(200));
      }
      expect(result.current).toBe("");
      act(() => vi.advanceTimersByTime(300));
      expect(result.current).toBe("bat");
    });
  });

  describe("useMinimumDelay", () => {
    it("stays false for the minimum loader time, then true", () => {
      const { result } = renderHook(() => useMinimumDelay("query-1"));
      expect(result.current).toBe(false);
      act(() => vi.advanceTimersByTime(MINIMUM_LOADER_MS - 1));
      expect(result.current).toBe(false);
      act(() => vi.advanceTimersByTime(1));
      expect(result.current).toBe(true);
    });

    it("starts again for a new key", () => {
      const { result, rerender } = renderHook(({ key }) => useMinimumDelay(key), {
        initialProps: { key: "a" },
      });
      act(() => vi.advanceTimersByTime(MINIMUM_LOADER_MS));
      expect(result.current).toBe(true);
      rerender({ key: "b" });
      expect(result.current).toBe(false);
      act(() => vi.advanceTimersByTime(MINIMUM_LOADER_MS));
      expect(result.current).toBe(true);
    });
  });

  describe("useOnlineStatus", () => {
    it("follows the browser's online and offline events", () => {
      const onLine = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(true);
      onLine.mockReturnValue(false);
      act(() => window.dispatchEvent(new Event("offline")));
      expect(result.current).toBe(false);
      onLine.mockReturnValue(true);
      act(() => window.dispatchEvent(new Event("online")));
      expect(result.current).toBe(true);
      onLine.mockRestore();
    });
  });
});
