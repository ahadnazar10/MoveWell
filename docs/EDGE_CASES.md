# MoveWell: Edge Cases (EDGE_CASES.md)

Edge cases brainstormed with Claude and checked in the running app or by tests. Rows 1 to 39 were found and checked on the FitArena build and still apply, because MoveWell keeps that code for every department. Rows 40 to 50 come from the MoveWell merge (see `CONFLICTS.md`). **Status:** *Handled* = worked when checked; *Fixed* = was broken, now fixed; *N/A* = does not apply to this app. "Verified by" points to the unit test file, the self-test id in `TEST_PLAN.md` (for example ST 4.4), or a manual check.

| # | Edge case | Risk | How MoveWell handles it | Status | Verified by |
|---|---|---|---|---|---|
| 1 | Product stock is 0 | Buying an out-of-stock item | Card and product page show "Out of stock"; Add to cart disabled | Handled | ST 1.10 |
| 2 | Stock is 1 to 4 | Overselling | "Only N left" below 5; quantity capped at stock; asking for more focuses and selects the input with a message | Handled | ST 1.10, ST 3.4 |
| 3 | Clicking a card's Add to cart more times than there is stock | Cart above stock | `addToCart` caps the line at stock and says "You already have all N" | Fixed | `cartSlice.test.js` |
| 4 | Ten rapid + clicks | Lost clicks | `changeQuantity` delta, not `value + 1` | Handled | `cartSlice.test.js`, ST L4.1 |
| 5 | Unknown product id (`/products/99999`) | Blank page | "Product not found" page | Handled | ST 3.8 |
| 6 | Product with no image or a broken image path | Broken image icon | Placeholder image | Handled | Browser probe (products 10 and 18) |
| 7 | Very long product title | Layout breaks | Titles clamp to two lines on cards and wrap on the product page | Handled | Browser probe (product 57), wireframes |
| 8 | Discount of 0 vs no discount field | Wrong struck price | Both treated as "no discount" | Handled | `utils.test.js`, ST 1.9 |
| 9 | Fast typing in search with 0 to 2 s delays | Old results replace new ones | Debounce plus latest-request guard | Handled | ST L2 |
| 10 | Typing "/" in another field | Focus jumps to search | Shortcut ignored while typing in inputs, textareas, selects | Handled | ST 2.2 |
| 11 | Min price greater than Max, or negative | Empty or wrong results | Inline error; the invalid pair is not applied | Handled | Browser probe |
| 12 | Invalid PIN typed in the header | Wrong delivery date | Only 6 digits accepted ("Enter a 6-digit PIN"); previous PIN kept | Handled | Browser probe |
| 13 | Cart added to, then page refreshed within 150 ms | Last change lost | Pending writes flushed on `pagehide` and when the tab is hidden | Fixed | Playwright e2e |
| 14 | Two tabs open | Stale cart or wishlist | BroadcastChannel and storage events keep both in sync | Handled | Browser probe (add in tab A, badge updates in tab B) |
| 15 | Wishlist save fails | Heart out of sync | Heart flips back and a toast explains | Handled | ST 4.10 |
| 16 | Removing an item by accident | Lost item | Confirm dialog (Escape, Cancel, click outside); focus returns | Handled | ST 4.4 |
| 17 | Store manager deletes a product that is in a cart | Broken cart row | "No longer sold" notice with Remove; checkout disabled until resolved | Handled | Browser probe |
| 18 | Stock drops below a cart quantity while the cart is open | Surprise at checkout | Row warning; checkout disabled until fixed | Fixed | `CODE_REVIEW.md` CR-4 |
| 19 | Stock drops between adding and placing | Overselling | Per-item `getStock` re-check, then a final check in `placeOrder` (409) | Handled | ST L7.2, `ordersService.test.js` |
| 20 | Price changes while the shopper is on Review | Charged a price they did not see | Notice with old and new price; Place order disabled until accepted; service 409 as a final check | Fixed | ST L7.1 |
| 21 | Place order fails (about 1 in 3) and the shopper clicks again | Duplicate order | Same `clientOrderId` on every retry; ref guard against double clicks | Handled | `ordersService.test.js`, ST 5.9, ST 6.2 |
| 22 | Browser goes offline on Review | Order lost | Banner; Place order disabled until back online | Handled | ST 5.8 |
| 23 | Saved address deleted in another tab while selected at checkout | Blank delivery address | Switches to the new-address form with a message | Fixed | `CODE_REVIEW.md` CR-3 |
| 24 | Expired card or 15-digit number | Invalid payment | Inline errors; focus moves to the first | Handled | `checkoutValidation.test.js`, ST 5.6 |
| 25 | Status checked hours after ordering | Stale tracker | Status derived from `placedAt`, not stored | Handled | `utils.test.js`, ST 6.7 |
| 26 | Cancel after 60 seconds | Cancelling a shipped order | Button hidden after 60 s; service rejects with 409 | Handled | `ordersService.test.js`, ST 6.4 |
| 27 | Opening `/order-confirmation/ORD-XXXXXX` that doesn't exist | Blank page | Redirects home | Handled | ST 6.5 |
| 28 | Shopper opens `/admin` | Unauthorised access | Sign-in prompt, then back to the requested page after switching role | Handled | ST 8.1 |
| 29 | `?from=/\evil.example` on the sign-in page | Open redirect | Only same-site paths allowed | Fixed | `utils.test.js` |
| 30 | Admin clicks Undo after a bulk delete | Data lost | Nothing is deleted until the 5 s Undo ends | Fixed | `Toaster.test.js`, ST 8.7 |
| 31 | Admin picks many images in a row | Memory leak | Preview URLs revoked when replaced and on close | Handled | ST 8.5 |
| 32 | Admin uploads a large or non-image file | Storage full, broken image | Images only, up to 5 MB each | Handled | Browser probe (text file, 6 MB file) |
| 33 | Editing product A, then choosing product B | Mixed values | Form keyed by product id | Handled | ST 8.2 |
| 34 | Leaving the admin form with unsaved changes | Work lost | In-app confirm dialog; browser prompt on tab close | Handled | ST 8.3 |
| 35 | Stored data edited or corrupted in DevTools | Crash on load | Every storage read is shape-checked and falls back safely; each stored product record is checked too, so one bad record is ignored instead of crashing every list | Fixed | `productsService.test.js`, `cartSlice.test.js`, browser probe |
| 36 | Theme changed to Dark, then refresh | Flash of light theme | Inline script applies the stored theme before the app loads | Fixed | ST 7.4 |
| 37 | Order id generation with a stubbed or unlucky `Math.random` | Endless loop | Ids step forward from a random start and always end | Fixed | `ordersService.test.js` |
| 38 | A page crashes while rendering | Blank screen | Error boundary per page with Try again; header and footer keep working; navigating away recovers | Handled | Browser probe (forced crash with a malformed stored product, before row 35's fix) |
| 39 | Two shoppers on the same device | Shared cart | N/A: no accounts, one browser = one shopper | N/A | |
| 40 | Old link or bookmark `/products?category=Cricket` | Empty results after `category` became the department | A non-department `category` value is matched against `subcategory`, so the link shows Sports → Cricket | Fixed | `productsService.test.js` ("legacy ?category=Yoga link still works") |
| 41 | Admin edit saved by the FitArena build (`category: "Cricket"`, no `subcategory` or `goals`) | Product vanishes from its department or crashes a filter | Read into the new schema as `sports` / `Cricket` with `goals: []` | Fixed | `productsService.test.js` ("reads a pre-merge FitArena admin edit") |
| 42 | Two source products mapping to the same MoveWell id | One product silently replaces another | Per-store id ranges (1000 + n, 2000 + n); the merge script throws on a clash | Handled | `merge-products.mjs`, `productsService.test.js` ("without losing products or reusing an id") |
| 43 | Admin `nextId` saved by FitArena (63 and up) reaching the new id ranges (1001+) | A new product overwrites a StrideHub or MediKart product | `createProduct` skips any id the merged seed already uses | Fixed | Code (`createProduct` in `productsService.js`) |
| 44 | StrideHub and MediKart image files were not supplied | Every Footwear and Health card shows "Image unavailable" | The merge script generates an SVG card per product; the placeholder still covers broken paths | Fixed | `public/images/footwear/`, `public/images/health/` |
| 45 | MediKart specs copied across a whole category (e.g. Ibuprofen listing "Composition: Paracetamol") | Wrong medicine facts shown to shoppers | Keys identical across a whole category move to `sourceCategorySpecs` and are not shown | Fixed | `merge-products.mjs`, `CONFLICTS.md` §3 |
| 46 | Medicines tagged with a fitness goal | Health products recommended as if they treat something | Goals are only derived for general first-aid, support and recovery items, never medicines; health product pages show a "not medical advice" note | Handled | `merge-products.mjs` (`deriveGoals`), product page |
| 47 | A kit slot's best product is out of stock or deleted by an admin | Kit shows an unavailable item | Slots are filled from the live catalogue with the best in-stock match; a slot with no match is left out | Handled | `productsService.test.js` ("getKits fills every kit … in-stock") |
| 48 | Adding a kit when some items are already at the stock limit or out of stock | Cart above stock, or the whole kit fails | Each item goes through the stock-capped `addToCart`; skipped items are reported in the toast | Handled | `cartSlice.test.js` ("adds a cross-category kit …") |
| 49 | Stored or cross-tab fitness goal that is not Running, Gym or Yoga | Broken recommendations | Unknown values are ignored | Handled | `profileSlice.test.js` |
| 50 | Carts, wishlists and orders saved before the merge | Emptied cart, broken order history | FitArena ids 1 to 62 and the `fitarena:` storage keys were kept unchanged | Handled | `CONFLICTS.md` §1 and §5 |
