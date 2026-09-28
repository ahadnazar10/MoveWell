# MoveWell

**Everything you need for an active lifestyle.** MoveWell is the team capstone that
merges three individual stores into one shop with one cart:

| Category | Original store | Source data |
|---|---|---|
| Sports | FitArena (this codebase, the technical base) | `src/data/products.json` |
| Footwear | StrideHub | `src/data/StrideHub.json` |
| Health | MediKart | `src/data/MediKart.json` |

The unified catalogue (`src/data/movewell-products.json`, 178 products) is built by
`node scripts/merge-products.mjs`. MoveWell adds a **Fitness Goal Profile** (Running,
Gym, Yoga) that drives cross-category recommendations, and **MoveWell Kits**, starter
bundles that combine sports gear, footwear and health essentials. See
[`docs/MERGE.md`](docs/MERGE.md), [`docs/CONFLICTS.md`](docs/CONFLICTS.md) and
[`docs/TEAM.md`](docs/TEAM.md).

Everything below describes the FitArena foundation, which MoveWell keeps: no server,
database or external API. Product data starts in JSON, and everything a shopper or
store manager changes is kept in browser storage through a simulated, slow and
sometimes-failing data service.

FitArena capstone brief: `docs/09_Sports_and_fitness_FitArena.docx`.

## Setup

Requires Node 20 or newer.

```bash
npm install
node scripts/merge-products.mjs   # (re)build the unified catalogue and footwear/health images
npm run dev       # development server, with the developer controls panel
npm test          # 93 unit and integration tests
npm run selftest  # 78-check Playwright self-test (see e2e/selftest.mjs for the servers it needs)
npm run lint      # ESLint, React Hooks rules on
npm run build     # production build (no developer controls)
npm run preview   # serve the production build
```

Service defaults come from `.env.development` (300 to 1,200 ms delay, 0% failure) and `.env.production` (300 to 800 ms, 0%). In development, the **Dev controls** button (bottom left) changes delay, failure rate and search delay at runtime, shows every service call, and resets all stored data to the original JSON.

## Features

- **Home and catalogue:** hero carousel of three offers, image collections, featured gear, shop by sport, Recently viewed. Grid of 1, 2 or 4 columns, 12 per page, skeletons for at least 1.5 s, errors with Retry.
- **Search, filter, sort:** live search from any page ("/" to focus), category, several brands, rating and price filters with counts, five sorts, removable chips, all kept in the URL.
- **Product detail:** gallery with arrow keys, Description / Specifications / Reviews tabs, quantity with +5, stock refreshed every 30 s, delivery date by PIN, reviews with a star input, related products.
- **Cart and wishlist:** mini-cart drawer, confirm-before-remove dialog, GST, ₹49 shipping below ₹999, savings, toasts, optimistic wishlist heart.
- **Checkout:** Address, Payment and Review with saved addresses, billing beside delivery, validation on blur and submit, offline guard, stock re-check, idempotent order placement.
- **Orders:** confirmation with savings rows, status tracker, 60-second cancel, print-ready invoice.
- **Account:** Orders, Addresses and Preferences (Light, Dark or System theme, no flash on refresh).
- **Admin:** role switch with sign-in redirect, sortable and searchable products table, bulk delete with Undo, add and edit form with image upload, unsaved-changes guard, changes shown in every open tab.
- **Level-ups:** L2 unreliable search, L4 mini-cart drawer, L7 prices and stock change. See `docs/CHALLENGES.md`.

## Architecture

```
src/
  app/            store, persistence middleware, cross-tab sync, router flags
  services/       the in-browser data service (simulate(), products, orders, reviews, addresses, images)
  features/       Redux slices and thunks; checkout reducer and validation; admin form validation
  context/        LocationContext (delivery PIN), ThemeContext, RoleContext
  hooks/          useDebouncedValue, useMediaQuery, usePageView, useOnlineStatus, useProductsByIds,
                  useMinimumDelay, useProductImage, useUnsavedChangesPrompt
  components/     Header, Footer, HeroCarousel, ProductCard, Modal, ConfirmDialog, MiniCartDrawer,
                  Tabs, QuantityInput, StarRatingInput, ReviewList, Toaster, OrderSummary, ...
  pages/          Home, Products, ProductDetails, Cart, Wishlist, Checkout, OrderConfirmation,
                  SignIn, NotFound, account/*, admin/*
  utils/          storage (validated reads), pricing, delivery, orderStatus, rupee, siteImages
```

Component tree (simplified):

```
App
├── Header (PIN form, role and theme, nav, live search, cart badge)
├── main
│   └── ErrorBoundary (per page) → Suspense → Routes
│       ├── Home → HeroCarousel, ProductCard × n
│       ├── Products → FilterSidebar, SortBar, ProductCard × 12
│       ├── ProductDetails → Gallery, QuantityInput, Tabs (ReviewList), ProductCard × 4
│       ├── Cart → OrderSummary, ConfirmDialog
│       ├── Checkout (lazy) → AddressFields × 2, OrderSummary
│       ├── OrderConfirmation → StatusTracker
│       ├── AccountLayout (lazy) → AccountOrders | AccountAddresses | AccountPreferences
│       └── RequireStoreManager → Admin (lazy) → ProductForm
├── Footer
├── Toaster (portal)
└── MiniCartDrawer (portal, built on Modal)
```

State map: shop state (products cache, cart, wishlist, recently viewed, orders, reviews, addresses, UI) in Redux Toolkit; delivery PIN, theme and role in React Context; filters, sort and page in the URL; form drafts in component state. Details in `docs/architecture.md` and `docs/ADR.md`.

## Quality results

| Check | Result |
|---|---|
| Tests | 93 passing (`npm test`) |
| Self-test of every Core item and level-up | 78 of 78 passing (`npm run selftest`, results in `docs/TEST_PLAN.md`) |
| Lint | Clean (`npm run lint`) |
| Lighthouse, production build: home | Performance 87 to 89, Accessibility 100, Best Practices 100 |
| Lighthouse: product page | 95 / 100 / 100 |
| Lighthouse: catalogue | 92 / 100 / 100 |
| axe (checkout steps, admin table and form, cart; light and dark) | 0 violations |
| Main JavaScript bundle | 425 KB (132 KB gzip); Checkout, Account, Admin, Cart, Wishlist and Order confirmation load on demand |
| Console during a full purchase | No errors or warnings |

## Cross-browser notes

Checked in Chrome (desktop and 360 px phone width). **To do:** Firefox and Edge or Safari, with any differences noted here.

## Explain answers

**What re-renders when an item is added to the cart, and why the rest does not?** The Add to cart click dispatches `addItem`. React Redux re-renders only components whose selected values changed: the header badge (`selectCartCount`), the mini-cart drawer, and anything showing "In your cart". Product cards select only whether that product is wishlisted, and `ProductCard` is wrapped in `React.memo`, so the other cards keep their props and are skipped. React then diffs the new elements against the old ones and changes only the badge text and the drawer in the DOM.

**How do componentDidMount, componentDidUpdate and componentWillUnmount map to the stock refresh?** The product page's effect starts a 30-second interval (mount), restarts it when `productId` changes because the id is a dependency (update), and clears the interval and ignores late responses in its cleanup (unmount, and before each re-run). One effect with a cleanup replaces all three methods.

**Controlled or uncontrolled: when is each better?** Controlled (checkout) when the UI reacts to every keystroke: validation on blur, input kept across steps, derived state such as "billing same as delivery". Uncontrolled and read on submit (admin product form) when nothing needs the values until Save: less re-rendering, simpler code, and a `key` gives a clean reset between products.

**Why is the delivery location in Context and the cart in Redux?** The PIN is one small value, set in one place and read in three unrelated components, with no async work or history. Context shares it without passing props through the layers in between. The cart is changed from many places, needs a middleware for persistence and cross-tab sync, has derived totals (memoized selectors), and benefits from action history in DevTools.

## AI reflection

**To do by the author:** where AI helped most, where it misled you, and what you would never accept from it without checking. Record the details in `docs/AI_JOURNAL.md`.
