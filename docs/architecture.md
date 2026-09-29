# MoveWell: Architecture

The state map and component tree for MoveWell, kept in step with the code (last checked 29 September 2026). MoveWell is the FitArena codebase extended with the StrideHub and MediKart catalogues. `specs.md` records FitArena's original plan, and `MERGE.md` records how the three stores were merged. Where the build differs from the plan, this file and `ADR.md` describe what was built.

## 1. System overview

There is no server. Everything below runs in one browser tab.

```mermaid
flowchart LR
    subgraph Browser["Browser tab"]
        UI["React components"]
        URLP["URL search params\n(category, subcategory, goal,\nfilters, sort, page;\nadmin ?edit=id)"]
        RTK["Redux Toolkit store\n(products cache, recommendations, kits,\ncart, wishlist, recentlyViewed, profile,\norders, reviews, addresses, ui)"]
        CTX["React Context\n(LocationContext, ThemeContext,\nRoleContext)"]
        SVC["Data service\nsrc/services/*\n(Promises, simulated delay + failure)"]
        DEVCFG["devConfig.js\n(module singleton, not Redux)"]
        MW["persistenceMiddleware\n(custom Redux middleware)"]
        LS[("localStorage (fitarena: prefix)\ncart, wishlist, recently viewed,\nfitness goal, orders, reviews, addresses,\nadmin edits, PIN, theme, role")]
        IDB[("IndexedDB\nuploaded product images")]
        SEED["src/data/movewell-products.json\n(178 products, read-only)"]
        KITS["src/data/kits.js\n(kit slot definitions)"]
    end

    MERGE["scripts/merge-products.mjs\n(run by hand, not in the browser)"] -. "builds" .-> SEED

    UI -- "dispatch(thunk)" --> RTK
    UI -- "read/write" --> URLP
    URLP -- "query → loadCatalogue" --> RTK
    RTK -- "thunks call" --> SVC
    UI -- "admin table, related products,\nstock refresh (local state)" --> SVC
    SVC -- "reads once" --> SEED
    SVC -- "getKits fills slots" --> KITS
    SVC -- "validated reads / writes" --> LS
    SVC -- "image blobs" --> IDB
    SVC -- "reads config, logs every call" --> DEVCFG
    DEVCFG -- "useSyncExternalStore" --> UI
    RTK -- "cart / wishlist / recentlyViewed /\nprofile actions" --> MW
    MW -- "debounced write, flushed on pagehide" --> LS
    MW -. "BroadcastChannel" .-> OTHER["Other tabs"]
    LS -. "storage event:\ncart, wishlist, goal, admin edits" .-> OTHER
    RTK -- "useSelector" --> UI
    UI -- "read/write" --> CTX
```

Components never touch the catalogue JSON, `localStorage` or IndexedDB for shop data. They go through the service, either directly for page-local data or through Redux thunks for shared state. Outside the service, only two things use storage directly: the persistence middleware, and the three Contexts, which store small preferences (PIN, theme, role). Both read through the validating `readStorage`.

**Unified catalogue.** `scripts/merge-products.mjs` combines FitArena (`products.json`), StrideHub (`StrideHub.json`) and MediKart (`MediKart.json`) into `movewell-products.json`. It does not modify the three source files. Each product's `category` is a department (`sports`, `footwear` or `health`), and its original store category becomes `subcategory`. Ids stay integers: FitArena keeps 1 to 62, StrideHub products get 1001 onwards and MediKart products 2001 onwards. `goals` tags (`running`, `gym`, `yoga`) drive the cross-category features. The schema and each decision are recorded in `MERGE.md` §3, and the conflicts found during the merge in `CONFLICTS.md`.

## 2. State map

| State | Where it lives | Written by | Read by |
|---|---|---|---|
| Catalogue page (products, total, status, error) | `productsSlice.items/total/status` | `loadCatalogue` thunk (products + departments + facets together, latest request only) | Home, Products |
| Product cache | `productsSlice.byId`, `detailStatus` | every catalogue, recommendation and kit load; `fetchProduct` (skipped when cached) | Product detail, cart, drawer, checkout, wishlist, recently viewed (via `useProductsByIds`) |
| Catalogue version | `productsSlice.catalogueVersion` | `catalogueChanged` (admin save here, or storage event from another tab) | pages reload when it changes |
| Departments and facet counts | `productsSlice.categories`, `facets` (department, subcategory and brand counts; subcategories and brands scoped to the chosen department) | `loadCatalogue` | Filter sidebar, Home "Shop by category" and "Browse by type" |
| Recommendations | `productsSlice.recommendations[goal]` (`{ ids, status }`, keyed by goal, `""` for the featured mix) | `loadRecommendations` | `Recommendations` (Home featured row, Goals page) |
| MoveWell Kits | `productsSlice.kits` (`{ items, status }`) | `loadKits` (slots filled from the live catalogue) | `KitCard` on Home, Goals and Kits pages |
| Fitness goal | `profileSlice.goal` (`"running"`, `"gym"`, `"yoga"` or none), persisted and synced across tabs | `GoalPicker`, Account → Preferences, cross-tab `replaceGoal` | Home, Goals page, recommendations |
| Filters, sort, page, search | URL search params (`category`, `subcategory`, `goal`, `brand`, `minRating`, `minPrice`, `maxPrice`, `sort`, `page`, `q`) | Header search and nav, filter sidebar, sort bar, chips, pagination | Products page, header nav highlight |
| Cart lines `{productId, quantity}` | `cartSlice` (one cart for every department) | add, merge (capped at stock), `addKitToCart`, +/− (`changeQuantity`), set, remove, clear, cross-tab replace | Header badge, drawer, cart, product page "In your cart", checkout |
| Cart totals | derived: `selectCartTotals` (memoized) | never stored | Cart, drawer, checkout |
| Wishlist ids | `wishlistSlice` | `toggleWishlist` (optimistic, rolls back on failure) | Cards, product page, header badge, Wishlist page |
| Recently viewed ids | `recentlyViewedSlice` | product page once the product loads; "forget" on the home row | Home |
| Orders | `ordersSlice.list` (+ `placeStatus`) | `submitOrder`, `fetchOrders`, `fetchOrder`, `cancelOrderThunk` | Confirmation, Account → Orders |
| Order status | derived from `placedAt` (`utils/orderStatus.js`) | never stored, except "Cancelled" | Status tracker, Account → Orders |
| Reviews | `reviewsSlice.byProductId` | `fetchReviews`, `submitReview` | Product page Reviews tab |
| Addresses | `addressesSlice` | fetch, add, edit, remove thunks | Checkout, Account → Addresses |
| Toasts, drawer open | `uiSlice` (toast callbacks in a map outside Redux) | `showToast`, `showActionToast`, drawer actions | Toaster, MiniCartDrawer |
| Delivery PIN | `LocationContext` | header PIN form | Product page, cart, checkout |
| Theme preference | `ThemeContext` (+ inline script before paint) | Account → Preferences, header select | `<html data-theme>` |
| Role (shopper / store manager) | `RoleContext` | header checkbox, sign-in page | `RequireStoreManager`, header admin link |
| Dev settings and call log | `devConfig.js` singleton | developer controls | `simulate()`, developer controls |
| Checkout draft (step, addresses, payment, card, errors, clientOrderId) | `useReducer` in Checkout (`checkoutReducer.js`) | form fields, step buttons | Checkout only; card data is never stored |
| Prices shown on Review | Checkout `seenPrices` state | set when Review opens; "Use the new prices" | Checkout price-change notice (L7) |
| Admin table (search, sort, category filter, page, selection, pending deletes) | Admin component state | table controls | Admin only |
| Product being edited | URL `?edit=id` / `?new=1` | table Edit, Add product | Admin form (`key` = id) |
| Admin form values (category, type, goals, …) | the form's own inputs (uncontrolled), read with FormData on save | typing | ProductForm on submit |
| Related products, "Complete your set", live stock | ProductDetails local state | service calls in effects | Product page only |

## 3. Component tree

```mermaid
flowchart TD
    Main["main.js\nStrictMode → Redux Provider → Theme/Location/Role providers → RouterProvider"]
    Main --> App["App\nSkip link, OfflineBanner, Header, main, Footer, DevControls, Toaster, MiniCartDrawer"]
    App --> EB["ErrorBoundary (keyed per page) → Suspense → Routes"]

    EB --> Home["/  Home (MoveWell landing page)"]
    Home --> Hero["Hero: Shop Sports / Footwear / Health"]
    Home --> Cats["Shop by category cards"]
    Home --> GP["GoalPicker + Recommendations (goal picks)"]
    Home --> Recent["Recently viewed → ProductCard (View again / forget)"]
    Home --> Featured["Featured across MoveWell → Recommendations → ProductCard"]
    Home --> HKits["MoveWell Kits → KitCard"]
    Home --> Types["Browse by type, Why MoveWell"]

    EB --> Products["/products  Products"]
    Products --> Filters["FilterSidebar (Category, Type, Fitness goal, Brand, Rating, PriceRange)"]
    Products --> Sort["SortBar (count, chips)"]
    Products --> Grid["ProductCard × 12 (department chip)"]

    EB --> Detail["/products/:id  ProductDetails"]
    Detail --> Gallery["Gallery"]
    Detail --> InCart["InYourCart (L4)"]
    Detail --> Qty["QuantityInput (useImperativeHandle)"]
    Detail --> Tabs["Tabs → TabList, Tab, TabPanel\n(specs ordered per department)"]
    Tabs --> Reviews["ReviewList → StarRatingInput"]
    Detail --> Set["Complete your … set (same goal, other departments)"]
    Detail --> Related["RelatedProducts → ProductCard (View details)"]

    EB --> Goals["/goals  Goals (lazy) → GoalPicker, Recommendations, KitCard"]
    EB --> Kits["/kits  Kits (lazy) → KitCard × 3"]

    EB --> Cart["/cart  Cart (lazy)"]
    Cart --> CartRow["CartRow × n → QuantityInput"]
    Cart --> Summary1["OrderSummary"]

    EB --> Wish["/wishlist  Wishlist (lazy) → ProductCard (Move to cart / Remove)"]

    EB --> Checkout["/checkout  Checkout (lazy)"]
    Checkout --> Stepper["Stepper"]
    Checkout --> Addr["AddressFields × 2 (delivery, billing), SavedAddressEditor"]
    Checkout --> Summary2["OrderSummary"]

    EB --> Confirm["/order-confirmation/:id  OrderConfirmation (lazy) → StatusTracker"]
    EB --> Account["/account  AccountLayout (lazy)"]
    Account --> AO["orders → AccountOrders"]
    Account --> AA["addresses → AccountAddresses → AddressFields"]
    Account --> AP["preferences → AccountPreferences (theme, fitness goal)"]
    EB --> SignIn["/sign-in  SignIn"]
    EB --> Guard["/admin  RequireStoreManager → Admin (lazy)"]
    Guard --> Table["products table (Category and Type columns, category filter)"]
    Guard --> Form["ProductForm (uncontrolled, FormData on submit;\nCategory select, Type, Fitness goals)"]
    EB --> NF["*  NotFound"]

    Modal["Modal (portal): the one dialog shell"] -.-> Confirm2["ConfirmDialog"]
    Modal -.-> Drawer["MiniCartDrawer"]
    Confirm2 -.->|used by| Cart
    Confirm2 -.->|used by| Checkout
    Confirm2 -.->|used by| Guard
```

`ProductCard` is one memoized component used in five places, each passing its own `actions`: the grid and recommendation rows (Add to cart), Related (View details), Recently viewed (View again / forget) and Wishlist (Move to cart / Remove).

`KitCard` shows a kit's items across all three departments with one "Add kit to cart" button. That button dispatches `addKitToCart`, which calls the existing stock-capped `addToCart` once per product. A kit therefore becomes ordinary lines in the one cart, with no bundle price.

`HeroCarousel.js` is no longer used by the home page but was left in place (`MERGE.md` §6).

## 4. Data flow: placing an order

The flow is unchanged from FitArena and is the same for every department.

```mermaid
sequenceDiagram
    participant U as Shopper
    participant C as Checkout (useReducer)
    participant R as Redux
    participant S as Data service
    participant L as localStorage

    U->>C: Address → Payment → Review
    Note over C: Review records the prices on screen (seenPrices)
    opt a price changes meanwhile (admin edit in another tab)
        C-->>U: "X is now ₹Y (was ₹Z)", Place order disabled until accepted
    end
    U->>C: Place order (ref guard blocks double clicks)
    C->>S: getStock(id) for every item, in parallel
    alt any item short
        C-->>U: list of short items with "Change to N" / "Remove"
    else all in stock
        C->>R: submitOrder({ clientOrderId, items with seen prices, … })
        R->>S: placeOrder (2 s, fails ~1 in 3)
        alt price or stock changed (409 with conflicts)
            S-->>R: reject { status: 409, details.conflicts }
            R-->>C: reload changed products, show what changed, input kept
        else random failure (500)
            S-->>R: reject { status: 500 }
            R-->>C: "try again" (same clientOrderId, so never placed twice)
        else success
            S->>L: save order with totals recomputed by the service, reduce stock
            S-->>R: { orderId, placedAt }
            R-->>C: clear cart, go to /order-confirmation/:orderId
        end
    end
```

## 5. Folder structure

```
scripts/
├── merge-products.mjs        builds movewell-products.json and the footwear/health SVG images
└── generate-products.mjs, assignImages.mjs   FitArena's original data helpers
src/
├── main.js, App.js           entry, providers, routes
├── app/                      store.js, persistenceMiddleware.js, crossTabSync.js, routerFuture.js
├── services/                 simulate.js, devConfig.js, productsService.js (catalogue, facets,
│                             recommendations, kits), ordersService.js, reviewsService.js,
│                             addressesService.js, imagesService.js
├── features/                 Redux slices: products/, cart/, wishlist/, recentlyViewed/, profile/,
│                             orders/, reviews/, addresses/, ui/; serviceThunk.js;
│                             checkout/ (reducer + validation); admin/ (form validation)
├── context/                  LocationContext, ThemeContext, RoleContext
├── hooks/                    useDebouncedValue, useMediaQuery, usePageView, useOnlineStatus,
│                             useProductsByIds, useMinimumDelay, useProductImage, useUnsavedChangesPrompt
├── components/               shared UI (ProductCard, GoalPicker, Recommendations, KitCard, Modal,
│                             ConfirmDialog, MiniCartDrawer, Tabs, QuantityInput, StarRatingInput,
│                             ReviewList, Toaster, StatusTracker, catalogueIcons, …)
├── pages/                    route components (incl. Goals, Kits); account/ and admin/ sub-folders
├── utils/                    storage (validated reads), catalogue (departments, goals, labels),
│                             pricing, delivery, orderStatus, rupee, shopper, safeReturnPath, siteImages
├── data/                     movewell-products.json (merged seed), products.json (FitArena),
│                             StrideHub.json, MediKart.json (sources), kits.js
└── test/setup.js             test environment fixes
public/images/                FitArena photos; footwear/ and health/ generated SVG cards
fonts.css                     self-hosted Oswald and Barlow
docs/                         specs, this file, ADR, merge record, conflicts, team, level-ups,
                              edge cases, code review, AI journal, security, test plan, peer tests,
                              wireframes/, team presentation
e2e/selftest.mjs              Playwright self-test (written against the FitArena build, see TEST_PLAN.md)
```

## 6. Settled items

- CSS approach: CSS Modules plus shared design tokens in `index.css`. The tokens were re-themed for MoveWell (deep-teal accent, one colour per department) and the structure is unchanged (`MERGE.md` §5).
- Router: data router so unsaved changes can be guarded (ADR 6). The departments reuse `/products?category=…`, and only `/goals` and `/kits` were added (ADR 9).
- Storage keys keep the `fitarena:` prefix so carts saved before the merge still load (`CONFLICTS.md` §5).
- Hosting: not decided. `npm run preview` serves the production build; a Vercel deploy needs a rewrite of all paths to `index.html`.

## 7. High-level architecture

The layers from the browser down to the data, and the libraries each layer depends on. §1 shows the same system at storage level; this view is by layer.

```mermaid
flowchart TB
    subgraph EXT["External dependencies (npm)"]
        direction LR
        REACT["react / react-dom 18"]
        RRD["react-router-dom 6\n(createBrowserRouter)"]
        RTKLIB["@reduxjs/toolkit 2 + react-redux 9"]
        ICONS["@phosphor-icons/react"]
        VITE["Vite 5 (build/dev)\nVitest + Testing Library, Playwright (tests)"]
    end

    subgraph ENTRY["Entry: main.js"]
        PROVIDERS["StrictMode → Redux Provider → ThemeProvider →\nLocationProvider → RoleProvider → RouterProvider"]
    end

    subgraph ROUTER["React Router (App.js)"]
        direction LR
        EAGER["Eager routes\n/ · /products · /products/:id · /sign-in · *"]
        LAZY["Lazy routes (React.lazy + Suspense)\n/cart · /wishlist · /checkout · /order-confirmation/:id\n/goals · /kits · /account/*"]
        GUARD["/admin → RequireStoreManager → Admin"]
    end

    subgraph UI["React components"]
        direction LR
        SHELL["App shell\nHeader (search, nav, role toggle), Footer,\nMiniCartDrawer, Toaster, OfflineBanner, ErrorBoundary"]
        PAGES["Pages\nHome, Products, ProductDetails, Cart,\nCheckout, OrderConfirmation, Account, Admin"]
        SHARED["Shared components\nProductCard, FilterSidebar, SortBar, QuantityInput,\nOrderSummary, KitCard, Modal / ConfirmDialog"]
        HOOKS["Custom hooks\nuseProductsByIds, useDebouncedValue,\nuseUnsavedChangesPrompt, useOnlineStatus"]
    end

    subgraph STATE["State"]
        direction LR
        STORE["Redux Toolkit store (app/store.js)\nproducts · cart · wishlist · recentlyViewed · profile\norders · reviews · addresses · ui"]
        MW["persistenceMiddleware\n+ crossTabSync"]
        CTX["React Context\nRoleContext (auth role) · ThemeContext ·\nLocationContext (delivery PIN)"]
        LOCAL["Component-local state\ncheckout useReducer, admin table,\nURL search params"]
    end

    subgraph SERVICE["Service layer (src/services)"]
        direction LR
        PS["productsService\n(catalogue, facets, search,\nrecommendations, kits, stock)"]
        OS["ordersService\n(placeOrder, 409/500 paths)"]
        RS["reviewsService"]
        AS["addressesService"]
        IS["imagesService"]
        SIM["simulate.js + devConfig.js\n(latency, random failures)"]
    end

    subgraph DATA["Products data and persistence"]
        direction LR
        JSON[("movewell-products.json\n178 products: sports, footwear, health")]
        KITSDATA[("data/kits.js")]
        LSD[("localStorage\nfitarena:* keys")]
        IDBD[("IndexedDB\nadmin image uploads")]
    end

    AUTH["Authentication (demo)\nNo passwords or server: RoleContext holds\nshopper | store-manager, persisted in localStorage.\nRequireStoreManager redirects to /sign-in?from=…"]

    ENTRY --> ROUTER --> UI
    UI -- "useSelector / dispatch" --> STORE
    STORE --> MW --> LSD
    UI -- "useContext" --> CTX
    CTX -. "role" .-> AUTH
    GUARD -. "checks" .-> AUTH
    UI --- LOCAL
    STORE -- "createAsyncThunk\n(serviceThunk.js)" --> SERVICE
    UI -- "page-local reads\n(related, live stock, admin table)" --> SERVICE
    PS --> JSON
    PS --> KITSDATA
    PS -- "admin edits overlay" --> LSD
    OS --> LSD
    RS --> LSD
    AS --> LSD
    IS --> IDBD
    SERVICE --> SIM

    REACT -.-> UI
    RRD -.-> ROUTER
    RTKLIB -.-> STORE
    ICONS -.-> SHARED
```

**Authentication.** MoveWell has no real authentication (out of scope, `specs.md` §11). The only access control is the role in `RoleContext`. Shoppers can browse, fill the cart and check out without signing in. Only `/admin` is protected: `RequireStoreManager` sends shoppers to `/sign-in?from=/admin`, and switching role there (or with the header toggle) returns them to the page they asked for, after `safeReturnPath` checks it.

## 8. User workflow

The main shopping path, Home → Products → Product Details → Add to Cart → Cart → Checkout → Order Confirmation, with search, filtering and the sign-in branch.

```mermaid
flowchart TD
    START(["Shopper opens MoveWell"]) --> HOME["/  Home\nhero, category cards, goal picks,\nfeatured, kits, recently viewed"]

    HOME -- "Shop a category" --> PRODUCTS
    HOME -- "Header search (debounced)" --> SEARCH["/products?q=…"]
    HOME -- "Featured / recent card" --> DETAIL
    SEARCH --> PRODUCTS

    PRODUCTS["/products  Products\n12 per page"]
    PRODUCTS --> FILTER{"Refine?"}
    FILTER -- "FilterSidebar: category, type, goal,\nbrand, rating, price" --> URL["Update URL search params\n→ loadCatalogue thunk"]
    FILTER -- "SortBar / pagination / remove chip" --> URL
    URL --> PRODUCTS
    FILTER -- "No results" --> EMPTY["Empty state: clear filters"] --> PRODUCTS
    PRODUCTS -- "Quick add on ProductCard" --> ADD
    PRODUCTS -- "Open a product" --> DETAIL

    DETAIL["/products/:id  Product Details\ngallery, specs, reviews,\nrelated, complete your set"]
    DETAIL -- "Choose quantity (capped at stock)" --> ADD
    DETAIL -- "Out of stock" --> WISH["Add to wishlist"]

    ADD["Add to Cart\ndispatch(addItem / addToCart)"] --> DRAWER["MiniCartDrawer opens + toast"]
    DRAWER -- "Keep shopping" --> PRODUCTS
    DRAWER -- "View cart" --> CART
    DRAWER -- "Checkout" --> CHECKOUT

    CART["/cart  Cart\nchange quantity, remove (confirm),\norder summary"]
    CART -- "Cart empty" --> PRODUCTS
    CART -- "Proceed to checkout" --> CHECKOUT

    CHECKOUT["/checkout  Checkout\nAddress → Payment → Review"]
    CHECKOUT --> STOCK{"Stock and prices\nstill valid?"}
    STOCK -- "Price changed" --> ACCEPT["Accept new prices"] --> CHECKOUT
    STOCK -- "Item short" --> FIX["Change quantity / remove"] --> CHECKOUT
    STOCK -- "OK" --> PLACE["submitOrder thunk\n(placeOrder, may fail)"]
    PLACE -- "500: try again (same clientOrderId)" --> CHECKOUT
    PLACE -- "Success: clear cart" --> CONFIRM

    CONFIRM["/order-confirmation/:orderId\nOrder Confirmation + StatusTracker"]
    CONFIRM -- "Continue shopping" --> HOME
    CONFIRM -- "View orders" --> ORDERS["/account/orders"]

    subgraph AUTHF["Authentication (store managers only)"]
        ADMINREQ["/admin requested"] --> ROLE{"Role =\nstore-manager?"}
        ROLE -- "No" --> SIGNIN["/sign-in?from=/admin\nContinue as store manager"]
        SIGNIN -- "setRole('store-manager')" --> ROLE
        ROLE -- "Yes" --> ADMIN["/admin  product table + ProductForm"]
    end

    HOME -. "Header: Admin link or role toggle" .-> ADMINREQ
    ADMIN -. "Save edit → catalogueChanged\n(prices update in cart and checkout)" .-> PRODUCTS
```

Shoppers never need to sign in: the cart, checkout and account pages are open to everyone. Checkout with an empty cart shows an empty state that links back to the shop, and `/order-confirmation` with an unknown id redirects home.

## 9. Redux Toolkit data flow (cart example)

Every Redux update follows one loop: a component dispatches an action, the slice reducer produces the next state, the store notifies subscribers, and selectors hand each component the part of state it reads.

```mermaid
flowchart LR
    COMP["Component\nProductCard / ProductDetails / Cart"]
    DISPATCH["dispatch()\nuseDispatch"]
    ACTION["Action\n{ type: 'cart/addItem',\npayload: { productId, quantity, max } }"]
    MWARE["Middleware\nthunk → persistenceMiddleware"]
    REDUCER["Reducer\ncartSlice.addItem\n(Immer: merge line, cap at stock)"]
    STORE[("Redux store\nstate.cart.items\n[{ productId, quantity }]")]
    SELECTOR["Selectors\nselectCartCount, selectCartQuantity(id),\nselectCartLines, selectCartTotals\n(createSelector, memoized)"]
    VIEW["Components re-render\nHeader badge, MiniCartDrawer,\nCart, OrderSummary, Checkout"]
    LS[("localStorage\nfitarena:cart")]
    TABS["Other tabs\n(BroadcastChannel → replaceCart)"]

    COMP -- "click Add to cart" --> DISPATCH
    DISPATCH -- "addToCart(product) thunk creates" --> ACTION
    ACTION --> MWARE
    MWARE --> REDUCER
    REDUCER -- "next state" --> STORE
    MWARE -. "after reducer: debounced write (150 ms)" .-> LS
    MWARE -. "broadcast" .-> TABS
    STORE -- "useSelector subscribes" --> SELECTOR
    SELECTOR --> VIEW
    VIEW -. "next interaction" .-> COMP
```

The same flow step by step, for adding a product to the cart from a product card:

```mermaid
sequenceDiagram
    autonumber
    participant PC as ProductCard
    participant T as addToCart thunk
    participant R as cartSlice reducer
    participant S as Redux store
    participant M as persistenceMiddleware
    participant Sel as Selectors
    participant H as Header / Drawer / Cart

    PC->>T: dispatch(addToCart(product))
    T->>S: getState().cart.items (quantity before)
    T->>R: dispatch(addItem({ productId, quantity: 1, max: product.stock }))
    R->>S: merge into existing line or push new line (≤ stock)
    S->>M: action passes through middleware
    M-->>M: debounce → writeStorage("fitarena:cart") + BroadcastChannel
    T->>S: getState().cart.items (quantity after)
    T-->>PC: { added, inCart }
    PC->>S: dispatch(showToast(...)), dispatch(openCartDrawer())
    S->>Sel: state changed → useSelector re-runs
    Sel-->>H: selectCartCount → badge, selectCartLines + selectCartTotals → drawer and cart
    Note over Sel,H: selectCartLines joins cart.items with products.byId,<br/>so prices always come from the product cache, never a copy
```

| Step | Cart example | File |
|---|---|---|
| Component | `ProductCard` "Add to cart", `ProductDetails` quantity form, `Cart` +/− and remove | `components/ProductCard.js`, `pages/ProductDetails.js`, `pages/Cart.js` |
| dispatch | `dispatch(addToCart(product))`, `dispatch(changeQuantity({ productId, delta, max }))` | same |
| Action | `cart/addItem`, `cart/changeQuantity`, `cart/setQuantity`, `cart/removeItem`, `cart/clearCart`, `cart/replaceCart` (cross-tab only) | `features/cart/cartSlice.js` (generated by `createSlice`) |
| Reducer | merges lines, clamps to `[1, stock]`, never stores product copies | `features/cart/cartSlice.js` |
| Store | `state.cart.items`, initialised from validated `localStorage` | `app/store.js` |
| Middleware | persists `cart/*` (except `replaceCart`) and broadcasts to other tabs | `app/persistenceMiddleware.js`, `app/crossTabSync.js` |
| Selector | `selectCartItems`, `selectCartCount`, `selectCartQuantity(id)`, `selectCartLines`, `selectCartReady`, `selectCartTotals` | `features/cart/cartSlice.js` |
| Component | Header badge, `MiniCartDrawer`, `Cart`, `OrderSummary`, `Checkout` | `components/`, `pages/` |
