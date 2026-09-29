# MoveWell: Architecture Decision Records (ADR)

This document records the key architectural and design decisions behind MoveWell, with the context, the options considered, the decision taken and its consequences. ADRs 1 to 7 were made for FitArena, the codebase MoveWell is built on, and still hold after the merge (each was re-checked on 29 September 2026). ADRs 8 to 11 record the decisions made when StrideHub and MediKart were merged in. `MERGE.md` and `CONFLICTS.md` give the full merge record.

---

## ADR 1 (full ADR): Where shop state lives. Redux Toolkit for shared shop state, React Context for small preferences

This is the project's most important decision: every module reads or writes state, and the brief asks for it to be explained and defended.

**Status.** Accepted. Revisited on 27 September 2026 against the finished FitArena app, and again on 29 September 2026 after the MoveWell merge; still holds.

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
- Redux Toolkit slices: `products` (page results, product cache, facets, catalogue version, recommendations, kits), `cart`, `wishlist`, `recentlyViewed`, `profile` (fitness goal, added for MoveWell, see ADR 10), `orders`, `reviews`, `addresses`, `ui` (toasts, drawer). One custom middleware (`persistenceMiddleware`) persists and broadcasts cart, wishlist, recently viewed and the fitness goal.
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
* **Context:** Catalogue filtering (category, type, fitness goal, brand, rating, price, sort) needs to be shareable, survive browser refreshes, and support native Back/Forward browser navigation.
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

## ADR 8: FitArena as the base; the other stores contribute data, not code

* **Status:** Accepted (29 September 2026)
* **Context:** MoveWell merges three individual capstone stores. FitArena was complete and tested (93 unit and integration tests, a 78-check self-test). For StrideHub and MediKart, only their `products.json` files were available in this repository.
* **Options Considered:**
  1. Start a new app and port features from all three stores.
  2. Keep one store's codebase as the base, merge the three catalogues into it, and extend it.
* **Decision:** Option 2, with FitArena as the base. FitArena is extended, not rewritten: its services, slices, routes, checkout and tests stay, and StrideHub and MediKart contribute their catalogues.
* **Consequences:** Every FitArena feature (checkout, orders, reviews, admin, level-ups L2, L4 and L7) works for all 178 products with no second cart or second product service. The StrideHub and MediKart state, routing and styling comparison in `MERGE.md` §4 is still to be filled in from their original repositories.

---

## ADR 9: One unified catalogue; `category` becomes the department

* **Status:** Accepted (29 September 2026)
* **Context:** The three JSON files used the same field names but different values: FitArena ids were integers, the others were strings (`"prod-001"`, `"p-001"`), and each store used `category` for its own product types. The whole app parses ids as integers, and old links use `/products?category=Cricket`.
* **Options Considered:**
  1. Keep three catalogues and three sets of routes (`/sports`, `/footwear`, `/health`).
  2. Rename fields to a new schema and change ids to strings everywhere.
  3. Merge into one file with FitArena's field names, integer ids in per-store ranges, `category` = department and the store's own category moved to `subcategory`.
* **Decision:** Option 3, built by `scripts/merge-products.mjs` into `src/data/movewell-products.json`. FitArena keeps ids 1 to 62; StrideHub becomes 1000 + n and MediKart 2000 + n, with the original id kept in `sourceId`. The service treats a non-department `category` value as a subcategory, and the departments reuse the existing `/products` route.
* **Consequences:** Carts, wishlists, reviews and orders saved by the FitArena build still resolve, and old links keep working. The merge script fails if two products map to one id. The conflicts it had to handle (copied MediKart specs, missing image files, old admin records) are in `CONFLICTS.md`.

---

## ADR 10: The fitness goal lives in Redux (`profileSlice`), not Context

* **Status:** Accepted (29 September 2026)
* **Context:** The shopper's fitness goal (Running, Gym or Yoga) is chosen on the home page, the Goals page or Account → Preferences. It drives the recommendations and the product page's "Complete your set" row, and it must survive a refresh and follow the shopper across tabs.
* **Options Considered:**
  1. A new React Context, like the PIN and theme.
  2. A small Redux slice persisted by the existing middleware.
* **Decision:** Option 2. `profileSlice` holds one validated value. `persistenceMiddleware` writes it and `crossTabSync` replays it (`replaceGoal`), exactly as for the cart.
* **Consequences:** No new persistence or tab-sync code was needed. Recommendation results are cached in `productsSlice` per goal, so switching back to a goal is instant. Unknown goal values are ignored (`profileSlice.test.js`).

---

## ADR 11: MoveWell Kits are defined by metadata slots, not product ids

* **Status:** Accepted (29 September 2026)
* **Context:** Marathon, Gym and Yoga starter kits must combine Sports, Footwear and Health products. Store managers can edit, restock or delete any product at any time.
* **Options Considered:**
  1. Hard-code a list of product ids per kit, with a bundle price.
  2. Describe each slot by department, goal and optional type, and fill it from the live catalogue.
* **Decision:** Option 2 (`src/data/kits.js`, `getKits()` in the data service). Each slot takes the best-rated in-stock match, a product fills at most one slot per kit, and a slot with no match is left out. "Add kit to cart" calls the existing stock-capped `addToCart` once per product (`addKitToCart`). There is no bundle discount.
* **Consequences:** Kits survive admin edits and deletions, and never show an out-of-stock item when another match exists. A kit becomes ordinary cart lines, so the cart, checkout and the service's recomputed totals always agree.

---

## Decision Log (one line per module)

Each line: the approach chosen, the main alternative, and why ours is better. Rows 1 to 8 are the FitArena modules; the MoveWell rows come from the merge (`MERGE.md`).

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
| MoveWell catalogue | One merged JSON built by a script; department in `category`, store category in `subcategory`; integer id ranges | Three catalogues and three sets of routes | One service, one cart and one set of filters for every department; saved carts and old links keep working |
| MoveWell goals | `profileSlice` persisted by the existing middleware; recommendations interleave departments | New Context; recommendations sorted by rating only | Tab sync for free; no single store dominates the row |
| MoveWell Kits | Slots described by department, goal and type, filled from the live catalogue | Fixed product ids and a bundle price | Kits survive admin edits; cart and checkout totals always agree |
