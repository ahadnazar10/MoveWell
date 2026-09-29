# MoveWell — Merge record

MoveWell combines three individual capstone stores into one active-living shop:

| Original store | Category in MoveWell | What it contributed |
|---|---|---|
| **FitArena** | Sports | The whole technical base (React, Redux Toolkit, routing, services, cart, checkout, orders, account, admin, tests) and its 62-product catalogue |
| **StrideHub** | Footwear | Its 50-product catalogue (`src/data/StrideHub.json`) |
| **MediKart** | Health | Its 66-product catalogue (`src/data/MediKart.json`) |

The rule throughout: **FitArena is extended, not rewritten.** StrideHub and MediKart
bring their catalogues and category-specific data; MoveWell is the single customer
experience on top. The main decisions are also recorded as ADRs 8 to 11 in `ADR.md`, and
the conflicts met along the way are in `CONFLICTS.md`.

---

## 1. What was inspected

### FitArena (the codebase in this repository)

- **React 18 + Vite**, `.js` files with JSX, CSS Modules plus global tokens in `src/index.css`.
- **Redux Toolkit** slices: `products` (results + product cache), `cart`, `wishlist`,
  `recentlyViewed`, `orders`, `reviews`, `addresses`, `ui`. One hand-written
  `persistenceMiddleware` (localStorage + BroadcastChannel), `crossTabSync` on the
  receiving side.
- **React Context** for delivery PIN, theme and role (shopper / store manager).
- **React Router v6**: `/`, `/products`, `/products/:productId`, `/cart`, `/wishlist`,
  `/checkout`, `/order-confirmation/:orderId`, `/account/*`, `/sign-in`, `/admin`.
  Filters, sort and page live only in the URL.
- **One data service** (`src/services/productsService.js`) over `src/data/products.json`
  with a localStorage overlay for admin edits, simulated delay/failure (`simulate.js`),
  filtering and sorting in the service.
- **Tests:** Vitest + React Testing Library (unit and one full-purchase integration test),
  plus a Playwright self-test (`e2e/selftest.mjs`).

### StrideHub and MediKart

Only their `products.json` files were supplied for the merge, so the comparison below
covers **their data**. Their code (state management, routing, styling) was not
available in this repository and is **not** described here, to avoid guessing.
The team should fill in section 4 from the original repositories.

---

## 2. Product data: structure and differences

All three files turned out to use **the same field names**:
`id, title, description, category, brand, price, discountPercentage, rating, stock, specs, thumbnail, images`.
The differences were in the *values*:

| Area | FitArena | StrideHub | MediKart |
|---|---|---|---|
| Products | 62 | 50 | 66 |
| `id` | integer `1`–`62` | string `"prod-001"`–`"prod-050"` | string `"p-001"`–`"p-066"` |
| `category` meaning | sport: Cricket, Football, Badminton, Gym equipment, Yoga, Activewear | shoe type: Sports shoes, Casual shoes, Formal shoes, Sandals, Heels, Kids shoes | health type: Vitamins and supplements, Pain relief, Diabetes care, Health devices, First aid, Baby care |
| `specs` keys | mixed case: `Material`, `size`, `weight`, `suitable for`, `skill level`, `warranty` | lower case: `size`, `colour`, `material`, `sole`, `closure`, `occasion` | Title case: `Composition`, `Pack size`, `Dosage form`, `Manufacturer`, `Storage instructions`, `Expiry period` |
| `discountPercentage` missing | 4 products | none | 18 products |
| Images | real photos in `public/images/` (1 product with an empty `images` array) | paths like `/images/runpro-elite.jpg` — **files not supplied** | paths like `/images/products/p-002.svg` — **files not supplied**; 12 products point at a deliberately missing thumbnail |
| Out of stock (`stock: 0`) | 5 | 0 | 12 |

Duplicate ids: none of the raw ids collide as strings, but FitArena's app and every
persisted cart/wishlist/order use **integer** ids, so the string ids had to be mapped
(section 3).

---

## 3. Final unified product schema

Built by `scripts/merge-products.mjs` into `src/data/movewell-products.json`
(178 products). The three source files are **not modified**.

```js
{
  id: 1001,                    // integer, unique across MoveWell
  title: "RunPro Elite",
  description: "…",
  category: "footwear",        // "sports" | "footwear" | "health"
  subcategory: "Sports shoes", // the original store's category
  brand: "RunFast",
  price: 5999,                 // selling price, rupees
  discountPercentage: 15,      // 0 when the source omitted it
  rating: 4.8,
  stock: 42,
  specs: { Size: "10", Colour: "Black", Material: "Mesh", … },
  goals: ["running"],          // fitness-goal tags: "running" | "gym" | "yoga"
  thumbnail: "/images/footwear/1001.svg",
  images: ["/images/footwear/1001.svg", "/images/footwear/1001-alt.svg"],
  source: "StrideHub",         // which store the record came from
  sourceId: "prod-001",        // its id in that store
  sourceCategorySpecs: { … }   // MediKart only, see CONFLICTS.md §3
}
```

### Decisions and why

| Decision | Why |
|---|---|
| **Keep FitArena's field names** (`title`, `discountPercentage`, `thumbnail`) rather than renaming to `name` / `mrp` | All three datasets already shared these names. Renaming would touch almost every component, test and persisted admin record for no functional gain. |
| **MRP is derived, not stored** — `originalPrice(product)` in `src/utils/pricing.js` | Storing both `price`, `mrp` and `discountPercentage` would create two sources of truth that an admin edit could make disagree. The existing helper already computes MRP everywhere it is shown. |
| **`category` = department, old value → `subcategory`** | The brief asks for `category: "sports" / "footwear" / "health"`. Keeping the store's own category as `subcategory` preserves it for filters, breadcrumbs and "More Cricket" related products. |
| **Integer ids in per-store ranges**: FitArena keeps `1`–`62`; StrideHub `prod-NNN` → `1000 + NNN`; MediKart `p-NNN` → `2000 + NNN` | Every layer (URL parsing, cart/wishlist validators, orders, PropTypes) expects integers. Keeping FitArena's ids unchanged means **carts, wishlists, reviews and orders already saved in shoppers' browsers keep working**. The original id is kept in `sourceId`. The script throws if two products ever map to the same id. |
| **Spec keys: first letter upper-cased** (`colour` → `Colour`), values untouched, empty values dropped | Consistent labels on the product page without inventing or losing data. |
| **`goals` derived from existing metadata**, not hand-picked | Sports: subcategory (Yoga, Gym equipment) + "running / gym / yoga" in the title or `suitable for` spec. Footwear: the `occasion` spec and the description, adult shoes only. Health: only general first-aid / support / recovery items (compression socks, cold pack, crepe and adhesive bandages, first aid kit, wipes, heating pad, weighing scale) — **never medicines**. |
| **Generated SVG images for footwear and health** (`public/images/footwear|health/<id>.svg`) | The source image files were not supplied. A neutral illustrated card (product name, type, brand) is honest and consistent; it is not a photo of the product. Replace with real photos when available — only the `thumbnail`/`images` paths change. |
| **`discountPercentage: 0` when missing** | FitArena's pricing already treats missing and 0 the same; storing 0 makes the schema uniform. |

Re-run the merge after changing any source file:

```bash
node scripts/merge-products.mjs
```

---

## 4. State, routing and styling differences

> **To complete from the StrideHub and MediKart repositories.** Only their product
> data was available when this merge was done. For each, note: state library and
> slices, how the cart was stored, routes and URL parameters, styling approach
> (CSS Modules / plain CSS / framework), and anything reused.

| Area | FitArena | StrideHub | MediKart | MoveWell decision |
|---|---|---|---|---|
| State | Redux Toolkit (slices listed above) + Context for PIN/theme/role | _to fill in_ | _to fill in_ | FitArena's store kept. **One** `cartSlice` for every category (no per-category carts). **One** `productsSlice` for every category. New `profileSlice` for the fitness goal. |
| Routing | React Router v6; filters in the URL | _to fill in_ | _to fill in_ | FitArena routes kept. Categories reuse `/products?category=…` (no `/sports`, `/footwear`, `/health` duplicates). Added `/goals` and `/kits` only. |
| Styling | CSS Modules + tokens in `src/index.css` | _to fill in_ | _to fill in_ | FitArena's CSS Modules kept; tokens re-themed for MoveWell (below). |

---

## 5. What changed in the app, layer by layer

### Data service (`src/services/productsService.js`) — extended, still one service

- Reads `movewell-products.json`.
- `getProducts` gains `subcategory` and `goal` filters. `category` accepts a department;
  a non-department value (an old link such as `?category=Cricket`) is matched against
  `subcategory`, so existing links and bookmarks keep working. Search also matches
  subcategory and department.
- `getCategories()` returns the three departments in fixed order; new
  `getSubcategories()` feeds the admin form.
- `getCatalogueFacets({ category })` returns department, subcategory and brand counts;
  subcategories and brands are scoped to the chosen department.
- New `getRecommendations({ goal, limit })` — goal-tagged products (or a featured
  in-stock mix), interleaved Sports → Footwear → Health so no store dominates.
- New `getKits()` — resolves MoveWell Kits (below) against the live catalogue.
- Admin records saved by the old FitArena build (`category: "Cricket"`) are read into
  the new schema (`sports` / `Cricket`); new admin ids skip the merged seed's ranges.

### Redux

- `productsSlice`: `loadCatalogue` passes the category to the facets call;
  new `loadRecommendations` (results keyed by goal) and `loadKits` thunks. All products
  they return go into the shared `byId` cache the cart and detail page already use.
- `cartSlice`: new `addKitToCart(products)` thunk that calls the existing `addToCart`
  per product (stock-capped). A kit becomes ordinary cart lines — there is one cart.
- New `profileSlice` (`goal`), persisted by the existing `persistenceMiddleware`
  and synced across tabs by `crossTabSync`, exactly like the cart.

### Routing (`src/App.js`)

| Route | Status |
|---|---|
| `/`, `/products`, `/products/:productId`, cart, checkout, orders, account, admin | Unchanged |
| `/products?category=sports\|footwear\|health` | New values on the existing route |
| `/products?subcategory=…`, `?goal=…` | New URL filters on the existing route |
| `/goals` | New (lazy) — Fitness Goal Profile |
| `/kits` | New (lazy) — MoveWell Kits |

### UI

- **Header:** MoveWell brand; nav Home · Shop all · Sports · Footwear · Health ·
  Fitness goals · Kits; search placeholder covers all categories. Cart, account,
  wishlist, PIN, role and theme controls unchanged.
- **Home (rebuilt as the MoveWell landing page):** hero ("Move better. Live better.")
  with Shop Sports / Footwear / Health; Shop by category cards; "What's your fitness
  goal?" picker with goal picks; Recently viewed; Featured across MoveWell (mixed
  categories); MoveWell Kits; Browse by type; Why MoveWell.
- **Catalogue:** Category (department), Type (subcategory), Fitness goal, Brand,
  Rating and Price filters; removable chips; heading reflects the selection.
- **Product card:** department-coloured chip with the product type.
- **Product details:** department + type breadcrumb; "Good for" goal chips;
  specifications ordered per department (Sports: material, size, weight…; Footwear:
  size, colour, material, sole, closure, occasion; Health: manufacturer, storage,
  expiry) with missing fields simply not shown; a "not medical advice" note on health
  products; "Complete your … set" (same goal, other departments); related products by type.
- **Cart:** department chip + type on each line; totals, GST and shipping unchanged.
- **Admin:** Category select (Sports / Footwear / Health), Type field with suggestions,
  Fitness goal checkboxes; table gains Category and Type columns and a category filter.
- **Account → Preferences:** fitness goal picker next to the theme setting.

### MoveWell Kits (`src/data/kits.js`)

Marathon, Gym and Yoga starter kits. A kit lists **slots described by metadata**
(department + goal + optional subcategory), never product ids. `getKits()` fills
each slot with the best in-stock, highest-rated match and never uses a product
twice in one kit, so kits survive admin edits, restocks and deletions. Each kit
spans all three departments. There is no bundle discount: the kit total is the sum
of the items, so the cart and checkout totals always agree.

### Design system

FitArena's structure (CSS Modules + tokens) is kept; the tokens in `src/index.css`
were re-themed:

- Brand accent deep teal `#0f766e` (white text 5.4 : 1), lime highlight for the hero.
- One colour per department, used by the shared `.dept-chip` class and category cards:
  Sports orange, Footwear violet, Health blue (light and dark variants, text-safe).
- Softer shape system: radius 4 / 8 / 14 px, pill buttons in the hero, rounded cards.
- Oswald headings and Barlow body kept (already self-hosted, no extra download);
  headings are no longer forced to upper case.

---

## 6. What was deliberately **not** changed

- Checkout (address → payment → review, validation, stock/price re-check, idempotent
  placement), orders and the 60-second cancel, reviews, wishlist, addresses, delivery
  PIN, theme, role switch, dev controls, cross-tab sync, error boundary and lazy routes.
- localStorage key prefix `fitarena:` and the BroadcastChannel name (see CONFLICTS.md §5).
- `HeroCarousel.js` is no longer used by the home page but was left in place.
