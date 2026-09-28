import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { devConfig } from "../services/devConfig.js";
import { routerFuture, routerProviderFuture } from "../app/routerFuture.js";

/**
 * One full purchase through the real app: product page → add to cart →
 * mini-cart → checkout (address, payment, review) → place order →
 * confirmation. Only the data service's random failure roll is pinned, so
 * placeOrder succeeds first time.
 */
async function renderApp(path) {
  // Fresh modules per test, so the store starts from the (cleared) storage.
  vi.resetModules();
  const { store } = await import("../app/store.js");
  const { App } = await import("../App.js");
  const { ThemeProvider } = await import("../context/ThemeContext.js");
  const { LocationProvider } = await import("../context/LocationContext.js");
  const { RoleProvider } = await import("../context/RoleContext.js");
  const router = createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries: [path],
    future: routerFuture,
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <LocationProvider>
          <RoleProvider>
            <RouterProvider router={router} future={routerProviderFuture} />
          </RoleProvider>
        </LocationProvider>
      </ThemeProvider>
    </Provider>
  );
  return { store, router };
}

describe("full purchase", () => {
  beforeEach(() => {
    window.localStorage.clear();
    devConfig.setDelay(0, 0);
    devConfig.setFailureRate(0);
    devConfig.setSearchDelayMax(0);
    vi.spyOn(Math, "random").mockReturnValue(0.99); // placeOrder's ~1/3 failure roll never fires
    vi.spyOn(console, "log").mockImplementation(() => {}); // page_view analytics
  });
  afterEach(() => vi.restoreAllMocks());

  it("goes from a product page to an order confirmation", async () => {
    const user = userEvent.setup();
    const { store, router } = await renderApp("/products/1");

    await screen.findByRole("heading", { level: 1, name: /English Willow Cricket Bat/i });
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    // The mini-cart drawer opens; go to checkout from it.
    const drawer = await screen.findByRole("dialog", { name: /Your cart \(1\)/ });
    await user.click(within(drawer).getByRole("button", { name: "Checkout" }));

    await screen.findByText("Step 1 of 3: Address", {}, { timeout: 10_000 });
    const field = (name) => screen.getByRole("textbox", { name, exact: true });
    const fillIn = async (name, value) => {
      await user.click(field(name));
      await user.paste(value);
    };
    await fillIn("Full name", "Aditi Rao");
    await fillIn("Email", "aditi@example.com");
    await fillIn("Phone", "9876543210");
    await fillIn("Address", "12 MG Road");
    await fillIn("City", "Bengaluru");
    await fillIn("PIN code", "560001");
    await user.keyboard("{Enter}"); // Enter submits the step

    await screen.findByText("Step 2 of 3: Payment");
    expect(screen.getByRole("radio", { name: /Cash on Delivery/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Review order" }));

    await screen.findByText("Step 3 of 3: Review");
    expect(
      screen.getByText(/Aditi Rao, 12 MG Road, Bengaluru 560001/)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Place order/ }));

    // placeOrder takes a fixed 2 seconds.
    await screen.findByRole(
      "heading",
      { level: 1, name: /your order is placed/i },
      { timeout: 10_000 }
    );
    expect(router.state.location.pathname).toMatch(
      /^\/order-confirmation\/ORD-[A-Z0-9]{6}$/
    );
    expect(store.getState().cart.items).toEqual([]);
    expect(screen.getByRole("table")).toHaveTextContent("English Willow Cricket Bat");
    expect(
      screen.getByText(/You saved on English Willow Cricket Bat/)
    ).toBeInTheDocument();
  }, 30_000);
});
