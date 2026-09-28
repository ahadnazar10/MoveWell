# FitArena — GitHub Milestones

Create these as GitHub Milestones (repo → Issues → Milestones → New
milestone). One PR per brief "Step" issue, attached to the milestone it
belongs to. Order = suggested due-date order; each milestone maps to a phase
or module in the brief so grading and check-ins line up naturally.

---

# Project Roadmap (Consolidated)

### M1 — Foundation & Core Setup

**Description:** Set up Vite, React Router, Redux Toolkit, Vitest, ESLint, and Prettier with working `dev/build/test/lint` scripts. Prepare `products.json` and the data service (handling delay, failure, status, persistence, and unit tests). Build the developer controls panel and core App Shell (header, footer, all routes, 404, error boundary) responsive at 360/768/1280px.  
**Done when:** Fresh clone passes lint/tests; state map, data service tests, and app shell ready.

---

### M2 — Shopper Experience (Catalogue & Search)

**Description:** Hero carousel, responsive grid, discount/stock badges, pagination/load-more, skeletons, recently viewed. Debounced search, `/` focus shortcut, category/brand/rating/price filters with live counts, sort options, filter chips, URL sync, empty state, and **Level-up L2** (unreliable search race-condition handling).  
**Done when:** Core passes with 3s delay and 100% failure rate; L2 race-condition guarantees verified.

---

### M3 — Product Details, Reviews & Cart

**Description:** Product page (`/products/:id`) with instant local state fallback, image gallery, compound `Tabs`, `QuantityInput` (`useImperativeHandle`), 30s stock refresh, `LocationContext` delivery estimate, reviews, and related items. Full cart management: GST/shipping/savings math, confirm-remove dialog, local persistence, toast stack, optimistic wishlist heart (`useOptimistic`), and **Level-up L4** mini-cart drawer.  
**Done when:** Direct product URL opens in new tab; cart/wishlist persist across restart; L4 three-places single-source-of-truth verified.

---

### M4 — Checkout, Orders & Account

**Description:** 3-step checkout (Address/Payment/Review) via `useReducer`, side-by-side forms with `useId`, blur/submit validation, offline banner, stock re-check, idempotent orders, and **Level-up L7** (handling price/stock changes pre-checkout). Confirmation page (`ORD-XXXXXX`), 20s post-order status tracker, 60s live cancel window, print invoice. Account layout, theme switcher (Light/Dark/System with no flash), and code splitting (`lazy`/`Suspense`).  
**Done when:** Checkout passes at 30% failure rate; L7 price/stock edge cases handled; order tracked 1 hr post-purchase; no theme flash.

---

### M5 — Code Refactoring & Store Manager Admin

**Description:** Phase 2 refactor pass: extract ≥3 custom hooks, Redux middleware, and refactor a component using AI (logged in `AI_JOURNAL.md`). Admin portal: role switcher, sortable/searchable product table, bulk delete + 5s toast undo, add/edit form using `useActionState`/`useFormStatus`, IndexedDB image picker, state isolation on product switch, unsaved changes guard, and cross-tab `storage` event sync.  
**Done when:** Refactored code passes all existing tests; admin price updates sync instantly to shopper tab via `storage` events.

---

### M6 — Quality, Hardening & Release

**Description:** Level-ups documentation (`docs/CHALLENGES.md`) and 10-bug hunt resolution. Edge case validation (`docs/EDGE_CASES.md` ≥20 entries), AI code review fixes (`docs/CODE_REVIEW.md`), Lighthouse audit (A11y 90+, Perf 85+), keyboard/screen-reader testing, multi-browser verification, npm audit, security check. Self-test, peer testing (`docs/PEER_TESTS.md`), final production build, deploy, and demo prep.  
**Done when:** All bug hunt issues and peer-reported blockers/majors are resolved and verified; production preview live.
---

## Suggested labels to pair with these milestones

`core`, `level-up`, `bug-hunt`, `refactor`, `docs`, `a11y`, `needs-mentor-review`
