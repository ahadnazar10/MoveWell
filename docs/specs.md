# FitArena — Technical Spec

Source brief: `09_Sports_and_fitness_FitArena.docx` (Perficient Global AI First
Academy, AI Skills Pillar). This file is the single source of truth for **how**
we build it; the brief is the source of truth for **what** is required. Where
the brief is ambiguous, this file records the decision and the reasoning —
those decisions also belong in `docs/ADR.md` as the brief requires.

## 1. Confirmed architecture decisions

| # | Question | Decision |
|---|---|---|
| 1 | Redux Toolkit? | **Required.** Used for all shop state (§3). |
| 2 | Where does cart live? | **Redux Toolkit.** Delivery PIN/location → **React Context.** |
| 3 | Data service shape | Plain async functions in `src/services/`, simulating delay/failure. No mock HTTP layer. |
| 4 | Cross-tab sync | `storage` events on `localStorage`, optionally `BroadcastChannel`. No SharedWorker. |
| 5 | Level-ups (need 3, from 3 different modules) | **L2** (Module 2, unreliable search), **L4** (Module 4, mini-cart drawer), **L7** (Module 5, prices/stock change at checkout). Rationale in §7. |
| 6 | React 19 features | **Optional**, per your call. Kept only where each one is already the best tool for the job regardless of React version, or where dropping it would leave a required "Explain" comparison unanswered (§5 explains each case; drop any of them and the doc still holds together). |
| 7 | Product images | Seed dataset: local files/generated placeholders. Admin-uploaded images: browser storage, via IndexedDB (§4.4) — `localStorage`'s ~5–10 MB quota and string-only values make it a poor fit for repeated image uploads. |
| 8 | Testing | Vitest + React Testing Library. GitHub Actions is a stretch goal only. |
| 9 | Deployment | Either a live link (Vercel — SPA rewrite needed, noted in README) or `npm run preview` of a production build. |
| 10 | Scope | All 8 modules' Core requirements + the 3 Level-ups above, following the brief's 5-phase plan. |

## 2. Tech stack

- React 19, JavaScript (`.js` files with JSX — team's established convention;
  no `.jsx`, no TypeScript, matching prior project style).
- React Router v6 (data APIs not required; the brief's routing asks — params,
  search params, nested/protected routes — are all v6-stable).
- **Redux Toolkit** (`createSlice`, `createAsyncThunk`, one custom middleware)
  for shop state.
- **React Context** for delivery PIN/location and theme.
- Vite, Vitest, React Testing Library, ESLint (`eslint-plugin-react-hooks`,
  rules never disabled), Prettier.
- No CSS framework decision is forced by the brief; plain CSS + CSS Grid/
  Flexbox is assumed unless the team prefers CSS Modules (record either way
  in the ADR — it's a real "compare two options" candidate).

## 3. State architecture

The brief itself requires an explanation of *why* something lives where; this
section is that explanation, condensed for the ADR.

### Redux Toolkit — shop state (crosses many unrelated components, needs
async orchestration, benefits from selectors/middleware)

| Slice | Holds | Notes |
|---|---|---|
| `productsSlice` | **Results only**: current page of products, total, loading/error | `getProducts` thunk. Does **not** hold filters/sort/pagination — see §10b for why that would create two sources of truth |
| `cartSlice` | Cart line items `{ productId, quantity }` | Persist to `localStorage`; custom middleware (§3.2) syncs on every change |
| `wishlistSlice` | Product ids | Optimistic toggle handled as a plain Redux pattern, not React's `useOptimistic` — see §10a |
| `recentlyViewedSlice` | Last 5 viewed product ids, most recent first, deduped | Own slice rather than piggybacking on `productsSlice` — a clean, testable reducer for the dedup rule (resolves the open item in `architecture.md`) |
| `ordersSlice` | Placed orders, status-by-elapsed-time is *derived*, never stored | `placeOrder`/`getOrders`/`cancelOrder` thunks |
| `reviewsSlice` | Reviews per product, keyed by productId | One review per shopper per product, enforced in the reducer |
| `addressesSlice` | Saved addresses | CRUD thunks mirroring the data service |
| `catalogueMetaSlice` | Categories + counts, derived via selector from `productsSlice`, not stored twice | — |

Dev controls (delay range, failure rate, call log) are **not** a Redux slice —
see §10c for why.

### React Context — narrow, rarely-changing, read-everywhere values

| Context | Holds | Why not Redux |
|---|---|---|
| `LocationContext` | Delivery PIN | Single primitive value, read in three unrelated leaf components (product detail, cart, checkout), never needs middleware, thunks, or time-travel debugging. The brief explicitly asks for this contrast in the demo. |
| `ThemeContext` | Light/Dark/System, resolved value | Paired with `useSyncExternalStore` against `matchMedia`; applying via `useLayoutEffect` before paint. A Redux round-trip would reintroduce the flash-of-wrong-theme the brief forbids. |
| `RoleContext` | Shopper vs Store manager (no real auth) | Simple toggle read by route guards; doesn't need serialized action history. |

### Local component state

Form drafts (checkout, admin product form), UI-only toggles (dialog open,
active tab, gallery index), and anything that doesn't outlive the component
that owns it.

### Custom hooks (minimum 3, from real duplication — see brief §React and state)

- `usePersistedReducer(key, reducer, initial)` — underlies the cart/wishlist
  persistence middleware pattern; reused wherever "survive a refresh" shows up.
- `useDebouncedValue(value, delayMs)` — search input, admin table search.
- `useMediaQuery(query)` — powers `ThemeContext`'s System option and any
  responsive JS (not CSS-only) decisions.
- `usePageView()` — called once in `AppLayout`, reads `useLocation()` and logs
  the `page_view` event on every route change, so this required behavior
  lives in one place instead of a duplicated `useEffect` in every page (§10f).

### 3.2 Custom Redux middleware (brief requires exactly one, solving a real need)

`persistenceMiddleware`: listens for `cart/*` and `wishlist/*` actions,
debounce-writes the relevant slice to `localStorage`, and re-broadcasts via
`BroadcastChannel` (falling back to the `storage` event where unsupported —
see §10e) so a second tab's store can rehydrate without a refresh
(Level-up-adjacent, but the *plain* Core requirement "cart persists across
refresh" already needs this middleware to exist).

This is the one hand-written `(store) => (next) => (action) => {}` middleware
the brief asks for by name. If a second, unrelated cross-cutting concern
comes up later (e.g. extra analytics beyond `usePageView`), reach for RTK's
built-in `listenerMiddleware` instead of hand-rolling a second middleware —
it's still Redux Toolkit, still "within React/JS," but gives type-safe
listeners keyed to exact action creators instead of another set of
string-prefix checks. Not needed for Core; noted here so it's the obvious
next move rather than a copy-paste of `persistenceMiddleware`.

## 4. Data layer

### 4.1 Dataset — `src/data/products.json`

- ≥ 60 products across the 6 categories (Cricket, Football, Badminton, Gym
  equipment, Yoga, Activewear), fields: `id, title, description, category,
  brand, price, discountPercentage, rating, stock, specs, thumbnail, images`.
- Deliberately messy, per the brief: some `stock: 0`, some `discountPercentage:
  0`, some with the field omitted entirely, some very long titles, some with a
  missing/broken image path — the UI must handle all of these, so the data
  must contain them.
- Prices are rupees-with-paise (e.g., `1299.50`), not integers.

### 4.2 Data service — `src/services/`

One function per row below. Every function returns a Promise; delay and
failure rate come from env vars (`VITE_SERVICE_DELAY_MIN/MAX`,
`VITE_SERVICE_FAILURE_RATE`), with dev defaults (300–1200 ms, 0%) and
production defaults (300–800 ms, 0%) overridable at runtime by the developer
controls panel (§4.3). Failures reject with `{ status, message }`.

| Function | Returns | Behavior |
|---|---|---|
| `getProducts({ q, category, skip, limit })` | `{ products, total }` | Search + pagination |
| `getProduct(id)` | product | 404 for unknown id |
| `getCategories()` | category names | — |
| `getStock(id)` | `{ id, stock }` | Always latest |
| `reserveStock(id, qty)` | `{ ok: true }` | 300 ms, fails 30% |
| `placeOrder(order)` | `{ orderId, placedAt }` | 2 s, fails ~1/3, 409 if any item OOS, decrements stock on success |
| `getOrders()` / `cancelOrder(id)` | orders / updated order | Cancel only within 60 s of placing |
| `getReviews(productId)` / `addReview(productId, review)` | reviews / saved review | One review per shopper per product |
| `getAddresses()` / `createAddress` / `updateAddress` / `deleteAddress` | addresses | GET/POST/PUT/DELETE semantics; 404 for unknown id |
| `createProduct` / `updateProduct` / `deleteProduct` | products | Store-manager only; visible in shop immediately |

Sorting/filtering happens **in the service** (mirrors a real backend contract
and keeps components thin) — recorded as the chosen option vs. "filter in
components" in the ADR.

### 4.3 Developer controls

Dev-build-only panel: live delay range + failure-rate sliders, a scrolling log
of every service call (function, args, duration, result), and a "reset to
original JSON" button.

**Not a Redux slice — see §10c.** Config lives in a plain module-level object
in `src/services/devConfig.js` (`{ delayMin, delayMax, failureRate }` plus a
ring-buffer call log), with a tiny manual subscribe/notify pair. `simulate.js`
(the shared delay/failure helper every service function calls) reads it
directly and pushes to the log — no import of the Redux store from inside
`src/services/`. The `DevControls` panel component reads it reactively via
`useSyncExternalStore(devConfig.subscribe, devConfig.getSnapshot)`, the same
hook already in use for `ThemeContext` and the offline banner, so no new
concept is introduced to get a live-updating panel. Excluded from the
production bundle via `import.meta.env.DEV`.

### 4.4 Persistence layer

| Data | Storage | Why |
|---|---|---|
| Cart, wishlist, addresses, orders, reviews, preferences, delivery PIN | `localStorage` (JSON) | Small, string-friendly, needs cross-tab `storage` events |
| Seed + admin-created/edited product records | `localStorage` (JSON), keyed by id, diffed against `products.json` at load | Small |
| Admin-uploaded product images | **IndexedDB** (Blob/dataURL, one object store) | Repeated uploads must not leak memory or blow the ~5–10 MB `localStorage` quota; revoke `URL.createObjectURL` handles after preview |

## 5. React feature map (decision #6: optional overall — here's the call on each)

| Feature | Status | Where / why |
|---|---|---|
| `useOptimistic` | **Skipped — superseded.** | Wishlist heart uses a plain Redux optimistic-reducer pattern instead (§10a). Simpler to test, doesn't require wrapping every dispatch site in a transition. |
| `useTransition` / `useDeferredValue` | **Level-up L1 only, not Core.** | Core's search just needs `useDebouncedValue` to cut service calls. These two matter only once the catalogue grows to 1,000 products (L1) and rendering itself gets heavy. |
| `useSyncExternalStore` | **Kept — best tool regardless of version.** | Offline banner (`navigator.onLine`), `ThemeContext` System mode (`matchMedia`), and the dev-controls panel (§4.3). This is the correct way to subscribe a component to a browser API; not really a "React 19" ask (it shipped in 18). |
| `useId` | **Kept — trivial and exactly fits.** | Checkout Address/Billing forms side by side, correctly linked labels. No simpler correct alternative once two copies of the same form share a page. |
| `useImperativeHandle` + `ref` | **Kept — it's the standard pattern for this.** | Reusable quantity input; product page imperatively focuses + selects it when stock is exceeded. This is what the pattern exists for — not a React-19-specific ask either. |
| Form actions, `useActionState`, `useFormStatus` | **Kept, but genuinely optional — see note.** | Admin add/edit product form. The brief's concept map pairs this directly against the *controlled* checkout form for a required "Explain: controlled vs uncontrolled, when each is better" answer (M5, M8). Drop it and that specific comparison has nothing to point at — a plain controlled form + local `isSaving` state works fine otherwise. |
| `lazy` + `Suspense` | **Kept — required regardless of React version.** | Account, Checkout, Admin code-split on first visit. Basic code-splitting, not a 19-only feature. |
| Error boundaries | **Kept — required regardless of React version.** | App shell fallback + Try again. |
| Portals | **Kept — required regardless of React version.** | Confirm dialog, toast stack, rendered above the sticky header. |
| `useLayoutEffect` (theme) | **Downgraded to a better pattern — see §10e.** | An inline blocking `<script>` in `index.html` sets the theme class before React ever mounts, which is the only way to guarantee *zero* flash regardless of hydration timing. `useLayoutEffect` (or a plain event handler) still handles reactive changes once Preferences is used. |

Net effect of the optional call: the two React-19-specific hooks that were
easiest to swap for something equally correct (`useOptimistic`,
`useLayoutEffect`-for-initial-paint) are swapped. The rest were either
already version-agnostic best practice, or tied to a requirement that would
otherwise go unanswered — flagged so you can veto any individual one.

## 6. Routing

```
/                          Home (hero carousel, grid, recently viewed)
/products                  Full catalogue + filters/sort (Level-up L1: /products/all)
/products/:id               Product detail
/cart                          Cart
/wishlist                        Wishlist
/checkout                          Address → Payment → Review (useReducer-driven steps)
/order-confirmation/:orderId          Confirmation + tracking
/account                                 Layout + side menu (protected: shopper role)
  /account/orders                          Order history
  /account/addresses                        Saved addresses
  /account/preferences                       Theme etc.
/admin                                        Store-manager area (protected: manager role)
  /admin/products                              Sortable/paginated table
  /admin/products/new | /admin/products/:id      Add/edit form
*                                                  Not-found
```

Filters/sort/search on `/products` are owned **solely** by URL search params
(`useSearchParams`) — shareable, survives refresh, Back/Forward works because
that's what browser history already does. They are read on every render and
passed straight into the `getProducts` thunk call; `productsSlice` stores only
the *result* of that call, never a second copy of the filter criteria. See
§10b for why this single-source-of-truth choice matters.

## 7. Level-up rationale (decision #5)

- **L2 — Unreliable search service (Module 2).** Cheap to build (just crank
  the search-call delay/failure), directly exercises the request-ordering
  problem ("only the latest search is ever processed") that's a genuinely
  common real bug, and it's testable without faking timers for very long.
- **L4 — Mini-cart drawer (Module 4).** Forces one real "three places, one
  source of truth" exercise (detail page, drawer, full cart page) without the
  concurrency depth of L5 (two tabs) or L6 (optimistic stock reservation
  under rapid clicking), which are disproportionately time-expensive for a
  single Level-up credit.
- **L7 — Prices/stock change at checkout (Module 5).** High-value or
  real-world correctness property ("never charge a price the shopper didn't
  see," "never oversell stock") with a bounded blast radius: it only touches
  the checkout re-check step already required in Core.

L5 (two-tab cart) and L6 (instant cart + reservation) are deferred as stretch
attempts only after all Core + these 3 Level-ups are done and verified,
consistent with the brief's phase plan (Step 17 onward).

## 8. Non-functional requirements

Carried over from the brief essentially verbatim (it is already precise):
Lighthouse Accessibility 90+ (home, product detail, checkout, admin table),
Lighthouse Performance 85+ (home, production build), 360px–desktop with no
horizontal scroll, full keyboard operability with visible focus, 4.5:1
contrast in both themes, semantic landmarks + one `h1` per page, Flexbox/Grid
each used where it fits (justified per use in the ADR), no console
errors/warnings in StrictMode through a full purchase, PropTypes on every
component, React Hooks ESLint rules never disabled.

## 9. Testing minimum (decision #8: Vitest + RTL)

Data service (success, 404, 409, random-failure branches), cart and checkout
reducers, ≥2 custom hooks, checkout validation, Tabs component keyboard
behavior, one full-purchase integration test. All timer-based behavior
(loader minimum, toasts, order status ticking) tested with fake timers, never
real waits.

## 10. Where this spec improves on the brief's literal concept map

The brief's concept coverage map is a checklist of scenarios, not a
prescription of exact mechanisms — and it says so ("most can be met in
several ways, and the first idea is rarely the best"). Everywhere below, the
change is still plain React/Redux/browser JS — nothing outside the approved
stack — and each is a one-line ADR entry waiting to happen.

**a. Wishlist optimism: Redux reducer, not `useOptimistic`.**
`useOptimistic` is built for a *local* piece of state tied to one pending
transition. The wishlist lives in Redux and can be toggled from several
places (card, detail page, wishlist page) — forcing `useOptimistic` in would
mean either lifting it awkwardly above Redux or wrapping every dispatch site
in `startTransition` for no real benefit. The Redux-native version is simpler:
the reducer flips the heart synchronously and immediately (`toggleWishlist`),
a thunk persists it, and a `revertWishlist` action (dispatched from the
thunk's `rejected` case) undoes it plus fires the "why" toast. Same UX the
brief asks for, one mental model instead of two.

**b. Filters/sort/pagination: URL only, never duplicated into Redux.**
Storing the same filter state in both `productsSlice` and the URL is a
classic two-sources-of-truth bug: which one wins after Back/Forward, a
direct link, or a manual URL edit? The brief's own requirement — shareable
links, refresh-safe, Back/Forward steps through filter states — describes
exactly what `useSearchParams` already gives you for free. `productsSlice`
holds only the *results* of the last `getProducts` call.

**c. Dev-controls config: a plain module singleton, not a Redux slice.**
`src/services/` is meant to be swappable for a real backend later (see
`architecture.md` §1's "Key point for the demo"). If the delay/failure
config lived in Redux, the service layer would need to import the store to
read it — a circular dependency (store → thunks → services → store) and a
coupling that has no reason to exist. A small module-level object with a
manual subscribe/notify pair keeps `src/services/` framework-agnostic; the
`DevControls` panel reads it with `useSyncExternalStore`, the same hook
already used for the offline banner and theme, so it's not a new pattern.

**d. Recently viewed: its own small slice.**
Resolves the open item in `architecture.md` §6. A dedicated
`recentlyViewedSlice` keeps the "last 5, most recent first, no duplicates"
rule in one small, directly testable reducer, rather than as sub-state bolted
onto `productsSlice` (which now owns nothing but the current page's results —
see §10b).

**e. Cross-tab sync: `BroadcastChannel` first, `storage` event as fallback.**
Both were approved as sufficient. `BroadcastChannel` is the better default
where supported: it doesn't require the writing tab to round-trip through
`localStorage` just to notify itself (the `storage` event famously never
fires in the tab that made the change), and it doesn't require listening for
unrelated key changes. `persistenceMiddleware` tries `BroadcastChannel` and
falls back to `storage` events only where it's unavailable.

**f. `page_view` logging: one hook, not one `useEffect` per page.**
The naive reading is "add a `useEffect` that logs on mount to every page
component" — 10+ copies of the same three lines, one of which will eventually
be pasted wrong. `usePageView()`, called once in `AppLayout` and driven by
`useLocation()`, logs exactly once per route change and doubles as one of the
brief's required "≥3 custom hooks from real duplication."

**g. Theme-before-paint: a blocking inline script, not just `useLayoutEffect`.**
`useLayoutEffect` only guarantees "before the browser paints *this commit*" —
it doesn't cover the gap between the browser painting the initial (unstyled)
HTML and React finishing hydration, which is exactly where a flash can still
sneak in on a slow device. The industry-standard fix (used by Next.js,
Docusaurus, and others) is a tiny inline `<script>` in `index.html`, outside
React entirely, that reads the saved preference and sets
`document.documentElement.dataset.theme` before anything renders. `ThemeContext`
+ `useSyncExternalStore` then just takes over reactive updates (System mode
following the OS live, and applying a manual change from Preferences) after
mount — it no longer has to win a race against first paint.

## 11. Explicitly out of scope for Core delivery

Real backend/API/auth, real payment processing, L5/L6/L8 Level-ups (stretch
only, attempted after Core + the 3 chosen Level-ups), all "Stretch goals"
(§ comparison, coupons, i18n, image zoom, admin dashboard, PWA install,
TypeScript migration) — attempted only once every Core item and quality step
in the brief is done, per the brief's own ordering.
