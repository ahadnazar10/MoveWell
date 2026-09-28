# FitArena: Architecture Decision Records (ADR)

This document records the key architectural and design decisions made for FitArena, explaining the context, options considered, decision taken, and consequences.

---

## ADR 1 (full ADR): Where shop state lives. Redux Toolkit for shared shop state, React Context for small preferences

This is the project's most important decision: every module reads or writes state, and the brief asks for it to be explained and defended.

**Status.** Accepted. Revisited on 27 September 2026 against the finished app; still holds.

**Context.**
- The cart, wishlist, orders, reviews, addresses and the product cache are read and changed from many unrelated places: the header badge, cards on four different pages, the mini-cart drawer, the product page, cart, checkout, account and admin.
- Most of that state comes from a slow, sometimes-failing service, so it needs loading and error status, request ordering (Level-up L2) and retries.
- The cart and wishlist must persist, sync across tabs, and reject malformed data from another tab.
- Separately there are three tiny values read almost everywhere but changed rarely: the delivery PIN, the theme and the shopper/store-manager role. The brief explicitly asks for the PIN to be in React Context and compared with Redux.

**Options considered.**

| | Option 1: Redux for everything | Option 2: Context for everything | Option 3 (chosen): Redux for shop state, Context for preferences |
|---|---|---|---|
| Shared shop state | Good: slices, thunks, selectors | Poor: one provider per concern; every consumer re-renders on any change unless split and memoized by hand | Good |
| Async (loading, errors, latest request) | Built in (createAsyncThunk, requestId) | Hand-written in each provider | Built in |
| Persistence and cross-tab sync | One custom middleware | Effects in every provider | One custom middleware |
| Derived totals | Memoized selectors (createSelector) | useMemo in consumers | Memoized selectors |
| Debugging | Redux DevTools action history | None | DevTools for shop state |
| Small preferences (PIN, theme, role) | Works, but needs actions, a reducer and selectors for one value each; theme must still be applied before paint outside Redux | Natural fit | Natural fit |
| Brief's requirement "PIN in Context" | Not met | Met | Met |

**Decision.** Option 3.
- Redux Toolkit slices: `products` (page results, product cache, facets, catalogue version), `cart`, `wishlist`, `recentlyViewed`, `orders`, `reviews`, `addresses`, `ui` (toasts, drawer). One custom middleware (`persistenceMiddleware`) persists and broadcasts cart, wishlist and recently viewed.
- React Context: `LocationContext` (PIN), `ThemeContext` (preference plus the OS theme via useSyncExternalStore), `RoleContext`.
- Not global at all: filters, sort and page live in the URL (ADR 2); checkout and admin drafts live in their pages.

**Consequences.**
- Adding to cart re-renders only what selects the cart (badge, drawer, "In your cart"); memoized ProductCards are skipped.
- One place (the middleware) owns persistence and cross-tab messaging, and malformed data is rejected at the reducer (`replaceCart`).
- The PIN is read on three pages with no props passed through the layers between.
- Cost: two state tools to learn, and a rule to follow (shop data in Redux, small preferences in Context, drafts local). The state map in `architecture.md` lists where each piece lives.

---

## ADR 2: Filter, Sort, and Search State Owned Solely by URL Search Params

* **Status:** Accepted
* **Context:** Catalogue filtering (category, brand, rating, price, sort) needs to be shareable, survive browser refreshes, and support native Back/Forward browser navigation.
* **Options Considered:**
  1. Store filter criteria in `productsSlice` state AND in the URL.
  2. Store filter criteria solely in URL search params (`useSearchParams`) and pass to `getProducts` thunk.
* **Decision:** Option 2. `productsSlice` holds only the *result* of the query, never the filter criteria.
* **Consequences:** Eliminates two-sources-of-truth bugs. URLs are 100% shareable and refresh-proof.

---

## ADR 3: Wishlist Optimistic Toggle via Redux Reducer Pattern

* **Status:** Accepted
* **Context:** Toggling a wishlist item should feel instantaneous to the shopper, with graceful rollback if the background sync fails.
* **Options Considered:**
  1. React 19's `useOptimistic` hook.
  2. Redux-native optimistic reducer flip with thunk error rollback.
* **Decision:** Option 2. The wishlist is global Redux state toggled from cards, detail pages, and the wishlist page. Redux-native optimistic state allows a single mental model across all UI components.
* **Consequences:** Instant UI responsiveness, direct testability without wrapping dispatch calls in `startTransition`.

---

## ADR 4: IndexedDB for Admin Product Images

* **Status:** Accepted
* **Context:** Store managers can upload product images in the admin interface.
* **Options Considered:**
  1. Base64 strings in `localStorage`.
  2. Browser Blob storage in `IndexedDB`.
* **Decision:** Option 2. `localStorage` has a strict 5MB string quota that would be exhausted quickly by image uploads. IndexedDB provides structured blob storage with generous quota limits. Products store an `"idb:<id>"` reference (a `blob:` URL would die on refresh); `useProductImage` turns it into an object URL and revokes it on unmount, and form previews are revoked when replaced.
* **Consequences:** Uploaded images survive refreshes, and picking many images in a row does not leak memory.

---

## ADR 5: BroadcastChannel & storage Event for Cross-Tab Synchronization

* **Status:** Accepted
* **Context:** Changes to the cart, wishlist or catalogue (a store manager's edit) in one tab must show in every open tab without a reload.
* **Options Considered:**
  1. SharedWorker.
  2. `BroadcastChannel` for cart and wishlist, plus the native `storage` event (fired in other tabs whenever localStorage changes).
* **Decision:** Option 2. The persistence middleware posts cart and wishlist changes on a BroadcastChannel; `crossTabSync.js` also listens to `storage` events as a fallback. Admin edits are written to localStorage by the data service, so the `storage` event is how other tabs learn about them: they dispatch `catalogueChanged`, drop the product cache and reload. Incoming data is validated before it replaces anything.
* **Consequences:** Cart, wishlist and price changes appear in other tabs within a moment. At checkout a changed price is shown to the shopper before they can pay (Level-up L7).

---

## ADR 6: Data Router for Navigation Blocking

* **Status:** Accepted (replaces the `<BrowserRouter>` in the original plan)
* **Context:** Module 8 needs a confirmation before leaving the product form with unsaved changes, including via Back, header links and switching products.
* **Options Considered:**
  1. `<BrowserRouter>` plus `window.confirm` on the form's own buttons.
  2. Patching `history.pushState` to intercept navigation.
  3. `createBrowserRouter` (data router) so `useBlocker` is available, keeping the existing `<Routes>` table inside `App`.
* **Decision:** Option 3. It is the supported API and catches every navigation. React Router's v7 future flags are enabled to keep the console warning-free.
* **Consequences:** One small change in `main.js`; tests render the app with `createMemoryRouter`.

---

## ADR 7: Order Status Derived From the Clock

* **Status:** Accepted
* **Context:** Placed, Packed, Shipped, Delivered every 20 seconds must be right after a refresh or hours later.
* **Options Considered:**
  1. Store the status and advance it with timers.
  2. Derive it from `placedAt` and the current time.
* **Decision:** Option 2 (`utils/orderStatus.js`). Only "Cancelled" is stored.
* **Consequences:** Always correct, no background timers, and testable with plain dates.

---

## Decision Log (one line per module)

Each line: the approach chosen, the main alternative, and why ours is better. Full reasoning for anything that differs from the brief is in `docs/APPROACH_DECISIONS.md`.

| Module | Approach chosen | Alternative considered | Why ours is better |
|---|---|---|---|
| Data service | Filtering, sorting and pagination in the service; one extra `getCatalogueFacets` for counts | Filter and count in components | Components never touch the JSON; totals and counts always agree with admin edits |
| 1 Home and catalogue | `loadCatalogue` thunk awaits products, categories and facets with `Promise.all`; `useMinimumDelay` keeps the skeleton 1.5 s | Separate thunks per resource | One status for "grid ready"; no flicker |
| 2 Search, filter, sort | URL is the only store of filters; one debounced header search; latest-request guard for L2 | Filters in Redux plus URL sync | No two sources of truth; shareable, refresh-safe, Back/Forward for free |
| 3 Product detail | Cache-first `fetchProduct` (thunk `condition`); Tabs matched by value; QuantityInput exposes focus/select via `useImperativeHandle` | Always refetch; Tabs by child index | Instant when cached; page can arrange tabs and panels freely |
| 4 Cart and wishlist | Cart stores ids only, products via `useProductsByIds`; one `Modal` shell; Redux optimistic wishlist | Copy product data into the cart; `useOptimistic` | Prices update everywhere; heart and badge update together |
| 5 Checkout | Controlled form in `useReducer` with pure validation; `clientOrderId` idempotency; final price/stock check inside `placeOrder` | Uncontrolled form; client-only L7 check | Input survives step changes; no race between check and order |
| 6 Confirmation | Status derived from time; savings row per discounted item; unknown id redirects home | Stored status | Correct after refresh or hours later |
| 7 Account | PIN in Context; nested routes with a shared layout; theme set before paint by an inline script | PIN in Redux | Single primitive read in three places; no middleware needed |
| 8 Admin | Uncontrolled form read with `FormData` on submit, `key` per product, edit state in the URL, deferred bulk delete | React 19 form actions; delete then re-create on Undo | Same contrast with checkout without a React upgrade; "nothing is deleted" holds exactly |
