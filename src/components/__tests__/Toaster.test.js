import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import uiReducer, { showToast, showActionToast } from "../../features/ui/uiSlice.js";
import { Toaster } from "../Toaster.js";

function setup() {
  const store = configureStore({ reducer: { ui: uiReducer } });
  render(
    <Provider store={store}>
      <Toaster />
    </Provider>
  );
  return store;
}

// All timing is driven by fake timers: nothing here really waits 3 seconds.
describe("Toaster", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("disappears after 3 seconds", () => {
    const store = setup();
    act(() => {
      store.dispatch(showToast("Added to cart", "success"));
    });
    expect(screen.getByText("Added to cart")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByText("Added to cart")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("Added to cart")).not.toBeInTheDocument();
  });

  it("pauses while hovered and resumes with the time that was left", () => {
    const store = setup();
    act(() => {
      store.dispatch(showToast("Removed", "info"));
    });
    const toast = screen.getByText("Removed").closest(".toast");
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("Removed")).toBeInTheDocument();
    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByText("Removed")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("Removed")).not.toBeInTheDocument();
  });

  it("stacks several toasts", () => {
    const store = setup();
    act(() => {
      store.dispatch(showToast("One"));
      store.dispatch(showToast("Two", "error"));
    });
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Two");
  });

  it("runs Undo instead of the expiry action when the button is pressed", () => {
    const store = setup();
    const onAction = vi.fn();
    const onExpire = vi.fn();
    act(() => {
      store.dispatch(
        showActionToast("Deleted 2 products", { actionLabel: "Undo", onAction, onExpire })
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    act(() => vi.advanceTimersByTime(10_000));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("runs the expiry action after 5 seconds when Undo is not pressed", () => {
    const store = setup();
    const onAction = vi.fn();
    const onExpire = vi.fn();
    act(() => {
      store.dispatch(
        showActionToast("Deleted 1 product", { actionLabel: "Undo", onAction, onExpire })
      );
    });
    act(() => vi.advanceTimersByTime(4999));
    expect(onExpire).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });
});
