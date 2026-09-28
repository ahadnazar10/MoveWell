import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header.js";
import { Footer } from "./components/Footer.js";
import { OfflineBanner } from "./components/OfflineBanner.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { Toaster } from "./components/Toaster.js";
import { MiniCartDrawer } from "./components/MiniCartDrawer.js";
import { DevControls } from "./components/DevControls.js";
import { RequireStoreManager } from "./components/RequireStoreManager.js";
import { usePageView } from "./hooks/usePageView.js";
import { Home } from "./pages/Home.js";
import { SignIn } from "./pages/SignIn.js";
// Not lazy: shoppers often land straight on a product or catalogue link, and
// those pages should not wait for an extra chunk before their first paint.
import { Products } from "./pages/Products.js";
import { ProductDetails } from "./pages/ProductDetails.js";
import { NotFound } from "./pages/NotFound.js";

// Module 7: Checkout, the Account area and the admin load their code only
// when first opened. The cart, wishlist and confirmation pages are split
// the same way to keep the first load light.
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const Cart = named(() => import("./pages/Cart.js"), "Cart");
const Wishlist = named(() => import("./pages/Wishlist.js"), "Wishlist");
const OrderConfirmation = named(
  () => import("./pages/OrderConfirmation.js"),
  "OrderConfirmation"
);
const Checkout = named(() => import("./pages/Checkout.js"), "Checkout");
const AccountLayout = named(
  () => import("./pages/account/AccountLayout.js"),
  "AccountLayout"
);
const AccountOrders = named(
  () => import("./pages/account/AccountOrders.js"),
  "AccountOrders"
);
const AccountAddresses = named(
  () => import("./pages/account/AccountAddresses.js"),
  "AccountAddresses"
);
const AccountPreferences = named(
  () => import("./pages/account/AccountPreferences.js"),
  "AccountPreferences"
);
const Admin = named(() => import("./pages/admin/Admin.js"), "Admin");
const Goals = named(() => import("./pages/Goals.js"), "Goals");
const Kits = named(() => import("./pages/Kits.js"), "Kits");

function RouteFallback() {
  return (
    <div className="container section" role="status">
      <p className="muted">Loading…</p>
    </div>
  );
}

export function App() {
  usePageView();
  const location = useLocation();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <OfflineBanner />
      <Header />

      <main id="main-content" tabIndex={-1}>
        {/* Keyed by path: a crash on one page is forgotten when the shopper navigates away. */}
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:productId" element={<ProductDetails />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/kits" element={<Kits />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route
                path="/order-confirmation/:orderId"
                element={<OrderConfirmation />}
              />
              <Route path="/order-confirmation" element={<Navigate to="/" replace />} />

              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<Navigate to="orders" replace />} />
                <Route path="orders" element={<AccountOrders />} />
                <Route path="addresses" element={<AccountAddresses />} />
                <Route path="preferences" element={<AccountPreferences />} />
              </Route>
              <Route path="/orders" element={<Navigate to="/account/orders" replace />} />

              <Route path="/sign-in" element={<SignIn />} />
              <Route
                path="/admin"
                element={
                  <RequireStoreManager>
                    <Admin />
                  </RequireStoreManager>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
      <DevControls />
      <Toaster />
      <MiniCartDrawer />
    </div>
  );
}
