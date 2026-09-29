# MoveWell: Test Plan and Self-Test Results (TEST_PLAN.md)

| Suite | Last run | Code it ran on | Result |
|---|---|---|---|
| Unit and integration tests (§1) | 29 September 2026 | MoveWell | 104 of 104 pass |
| ESLint | 29 September 2026 | MoveWell | No errors or warnings |
| axe, Lighthouse, layout (§2) | 27 September 2026 | FitArena, before the merge | See §2; not yet re-run on MoveWell |
| Playwright self-test (§3) | 27 September 2026 | FitArena, before the merge | 78 of 78; the script needs updating for MoveWell (§3) |

## 1. Automated tests (`npm test`)

Vitest and React Testing Library in jsdom. **104 tests in 13 files, all passing** (29 September 2026). The FitArena build had 93 tests in 12 files; the merge updated the catalogue tests to the new `category` meaning and added tests for departments, types, goals, legacy links, merge integrity, recommendations, kits and the fitness goal. Anything time-based uses fake timers, so nothing really waits; the one exception is the integration test, which waits for placeOrder's fixed 2-second delay.

| File | What it proves |
|---|---|
| `services/__tests__/simulate.test.js` | Delay, random failure (500), per-call overrides, call log |
| `services/__tests__/productsService.test.js` | Pagination; department, type (subcategory) and fitness-goal filters; legacy `?category=Yoga` links; several brands; search; Newest and Relevance order; department, type and brand facet counts scoped to the department; merge integrity (178 products, unique ids, StrideHub and MediKart id mapping); FitArena admin edits read into the new schema; recommendations mixing departments; kits filled from all three departments with in-stock, goal-matched products; the three departments in order; 404; stock; reserveStock (success, 500, 409); admin overlay; corrupt or malformed stored data ignored |
| `services/__tests__/ordersService.test.js` | ORD- ids, stock decrement, idempotent retries, 409 on stock, 409 with the changed price (L7), totals recomputed by the service, newest first, cancel window, cancel restocks |
| `features/cart/__tests__/cartSlice.test.js` | Add, merge, remove, set, clear, ten rapid + clicks = ten (L4), clamping, add-to-cart capped at stock, a cross-category kit added as ordinary lines (items at the stock limit or out of stock skipped), product never changed, malformed cross-tab data ignored, totals selector |
| `features/profile/__tests__/profileSlice.test.js` | No goal at first; set and clear a goal; values that are not a MoveWell goal ignored |
| `features/wishlist/__tests__/wishlistSlice.test.js` | Initial state, replace from another tab |
| `features/checkout/__tests__/checkoutReducer.test.js` | Input kept across steps, one clientOrderId, blur validation, billing only when different, saved address skips validation, card only when paying by card, card cleared after the order |
| `features/checkout/__tests__/checkoutValidation.test.js` | Required fields, email, 10-digit phone, 6-digit PIN, 16-digit card, expiry in the future |
| `hooks/__tests__/hooks.test.js` | `useDebouncedValue`, `useMinimumDelay` (1.5 s loader), `useOnlineStatus` |
| `components/__tests__/Tabs.test.js` | ARIA links, roving tabindex, arrow keys with wrap, Home/End, click, panels placed freely |
| `components/__tests__/Toaster.test.js` | 3 s dismiss, pause on hover, stacking, Undo vs expiry |
| `utils/__tests__/utils.test.js` | Discount rules, ₹49 shipping boundary, GST and savings rounding, rupee format, 3 working days, status every 20 s, cancel window, safe return path |
| `__tests__/purchase.integration.test.js` | Full purchase: product page → drawer → checkout → confirmation; cart cleared |

## 2. Other automated checks

These results are from the FitArena build (27 September 2026). The MoveWell home page, Goals and Kits pages, filters and re-themed colours have not been re-measured yet. Re-run axe and Lighthouse on the production build, in light and dark, before relying on these numbers for MoveWell.

- **Accessibility (axe-core):** every checkout step, the admin table and form, and the cart, in light and dark: 0 violations.
- **Lighthouse (production build):** home Performance 87 to 89, Accessibility 100, Best Practices 100; product page 95 / 100 / 100; catalogue 92 / 100 / 100 (27 September 2026).
- **Layout:** every route at 360, 390, 768, 1280 and 1440 px: one `h1`, no horizontal scroll. Wireframes of each page are in `docs/wireframes/`.

## 3. Self-test on the production build

**How it was run.** A Playwright script (Chrome) drove the app through every Core item and the three level-ups. The production build (`npm run build && npm run preview`) was used for everything except the rows marked DEV, which need the developer controls (failure rate, search delay) and so ran on `npm run dev`. The status tracker and 30-second stock refresh used Playwright's fake clock instead of waiting. The Actual column is what the run observed ("As expected" means every assertion in that check held). Re-run it with `npm run selftest` (see the header of `e2e/selftest.mjs` for the two servers it needs); results are written to `e2e/selftest-results.json`. The steps below are enough to repeat any check by hand.

**Status for MoveWell.** The run below was made on the FitArena build on 27 September 2026, before the merge. It is kept as the record of that build and is **not** a MoveWell result. `e2e/selftest.mjs` has not been updated or re-run since. Checks that no longer match the MoveWell app:

| Check | Why it no longer matches | What to change |
|---|---|---|
| 1.1, 1.2, 1.3 | The home page no longer uses `HeroCarousel`; the MoveWell hero is static | Replace with checks for the MoveWell home sections (Shop by category, goal picker, featured mix, kits) |
| 1.7, 8.7 | The catalogue has 178 products, not 62 | Expect "Showing 12 of 178 products" and the new table count |
| 2.3 | The Category filter now lists departments; "Cricket" is a Type | Check department counts and Type counts |
| 8.2 to 8.7 (admin form steps) | The admin form has a Category select (Sports, Footwear, Health), a Type field and Fitness-goal checkboxes (`CONFLICTS.md` §9) | Update the form steps |

Links that use `?category=Cricket` still work through the legacy mapping. New MoveWell checks to add:

| Check | Steps | Expected |
|---|---|---|
| Department pages | Open Sports, Footwear and Health from the header | Only that department's products; Type filter scoped to it |
| Fitness goal | Pick Gym on the home page; refresh; open a second tab | Goal kept after refresh and shown in the other tab; picks mix Sports, Footwear and Health |
| MoveWell Kits | Add the Marathon Starter Kit | One cart line per kit item, capped at stock; totals equal the sum of the items |
| Product page per department | Open a footwear and a health product | Specs in department order; "Good for" goal chips; "not medical advice" note on health products |
| Old saved data | Load the app with a cart and admin edit saved by the FitArena build | Cart items and the edited product still appear |

**Checks that need a person** (not automated, not yet done):

| Check | Why it can't be automated here | Status |
|---|---|---|
| Full purchase and one product edit using only the keyboard | Keyboard paths are covered piecemeal above (Tab, Enter, Escape, arrows, "/"); an end-to-end human run is still required by the brief | To do |
| Checkout with a screen reader (NVDA or VoiceOver) | Needs a person listening | To do |
| Firefox and Edge or Safari | Only Chrome was used | To do |
| Two peers run this plan and try to break the app | Needs other interns (`docs/PEER_TESTS.md`) | To do |

**Self-test history.** The first run found two real problems, both fixed and re-tested: a form nested inside the checkout form (row 5.5) and a price change on Review that could be charged without the shopper noticing (row L7.1). Details are in `docs/CODE_REVIEW.md` (CR-5, CR-6). The other failures in that first run were mistakes in the test script, corrected before the final run.

<!-- SELF-TEST RESULTS -->

**Result on the FitArena build (27 September 2026): 78 of 78 checks passed.**

### Module 1: Home and catalogue

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1.1 | Hero advances every 5 seconds | Open home; don't touch the page | Hero moves to the next offer every 5 s | slide 1 → 2 after 5.4 s | **Pass** |
| 1.2 | Hero pauses while hovered | Hover the hero for 6 s | Slide does not change | As expected | **Pass** |
| 1.3 | Hero pauses while focused; dots and arrows work by keyboard | Tab to the 3rd dot, press Enter; wait 6 s; activate Previous | Dot selects slide 3; no change while focused; Previous works | As expected | **Pass** |
| 1.4 | Recently viewed: last 5, newest first, no duplicates, survives refresh | Open products 1, 2, 3, 4, 5, 6, then 2 again; go home; refresh | 5 items, newest (2) first, no duplicates, still there after refresh | 5 items, newest "Kashmir Willow Cricket Bat" | **Pass** |
| 1.5-1280 | Grid shows 4 column(s) at 1280 px | Catalogue at 1280 px | 4 columns | As expected | **Pass** |
| 1.5-800 | Grid shows 2 column(s) at 800 px | Catalogue at 800 px | 2 columns | As expected | **Pass** |
| 1.5-390 | Grid shows 1 column(s) at 390 px | Catalogue at 390 px | 1 column | As expected | **Pass** |
| 1.6 | Skeleton stays at least 1.5 s | Open /products and time the skeleton | Skeleton shows for at least 1.5 s even when data is faster | skeleton visible 1901 ms (service answered in 300–800 ms) | **Pass** |
| 1.7 | 12 per page with 'Showing X of Y products' | Open /products | 12 cards and 'Showing 12 of 62 products' | Showing 12 of 62 products | **Pass** |
| 1.8 | Card shows image with alt, title, brand, price, rating, Add to cart | Inspect the first card | Image with meaningful alt, title, brand, price, rating, Add to cart | alt="English Willow Cricket Bat" | **Pass** |
| 1.9 | Discount % and struck price only when discounted | Find a product with no discount field, then a discounted one | No % or struck price without a discount; both shown when discounted | As expected | **Pass** |
| 1.10 | Out of stock disables Add to cart; 'Only N left' below 5 | Find an out-of-stock product, then one with stock 3 | 'Out of stock', button disabled; 'Only 3 left' | Only 3 left | **Pass** |
| 1.11 | Friendly error with Retry when products can't load (DEV, failure rate 1) | DEV: failure rate 1; open the catalogue | Friendly error with Retry | As expected | **Pass** |

### Module 2: Search, filter and sort

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| 2.1 | Results update while typing, no Enter | Press '/', type 'yoga mat' with no Enter | Results update after a pause | 4 results for "yoga mat" | **Pass** |
| 2.2 | '/' does not steal focus while typing in another field | Focus the PIN field, type '5/' | '/' is typed into the field; search not focused | As expected | **Pass** |
| 2.3 | Category options show counts | Open the filter sidebar | Categories show counts, e.g. 'Cricket (10)' | Cricket (10) | **Pass** |
| 2.4 | Several brands at once, rating and price range filter the results | Open ?brand=StrikeZone,ZenMat&minRating=4&minPrice=100&maxPrice=3000 | Results match all filters; one chip per filter | 8 results; chips: StrikeZone, ZenMat, 4★ & up, From ₹100, Up to ₹3000 | **Pass** |
| 2.5 | Price range applies on Enter, not per keystroke | Type 500 in Min price; then press Enter | Nothing applied while typing; applied on Enter | As expected | **Pass** |
| 2.6 | Sort: newest first, and Relevance restores the original order | Cricket: sort Newest, then back to Relevance | Highest id first; Relevance restores the original order | newest first: Cricket Abdominal Guard | **Pass** |
| 2.7 | Chips remove one filter; Clear all removes all | Remove the rating chip; click Clear all | One filter removed, then all | As expected | **Pass** |
| 2.8 | Filters survive refresh; Back and Forward step through them | Tick a brand, refresh, press Back, then Forward | Filter survives refresh; Back/Forward step through states | As expected | **Pass** |
| 2.9 | Clear empty state suggests removing a filter | Search 'zzzzzz' | Empty state suggesting removing a filter | Try removing a filter above, or clear them all to see the whole catalogue. | **Pass** |

### Level-up L2

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| L2 | Fast typing with 0–2 s search delays: results always match the box | DEV: search delay 0–2 s; type bat, gloves, yoga, football quickly | Screen shows exactly the results for 'football' | box "football"; screen shows the same 10 results as a clean search | **Pass** |

### Module 3: Product detail and reviews

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| 3.1 | Product already loaded elsewhere appears instantly | From the catalogue, open a product | Appears at once (no service delay) | 92 ms (service delay is 300–800 ms) | **Pass** |
| 3.2 | Gallery: arrow keys move between images | Focus the gallery, press Right | Image 2 of 2 shown | English Willow Cricket Bat, image 2 of 2 | **Pass** |
| 3.3 | Tabs follow the keyboard pattern | Focus Description tab, press Right, then End | Specifications, then Reviews selected | As expected | **Pass** |
| 3.4 | Quantity: +, −, +5, typing; over-stock focuses and selects the input | Press +5; type 999 | Quantity 6; then input focused and selected with a message | Only 32 more available. You asked for 999. | **Pass** |
| 3.5 | Delivery line uses the PIN, 3 working days | No PIN, then set PIN 560001 | Prompt to set a PIN; then 'Delivers to 560001 by <3 working days>' | Delivers to 560001 by Wed, 30 Sept | **Pass** |
| 3.6 | Review: keyboard stars, shown exactly as typed, average updates, one per shopper | Rate 4 stars with the keyboard, post a review containing HTML | Text shown exactly as typed; average updates; form replaced | average now 4.0 | **Pass** |
| 3.7 | Related products use the same card with their own action | Scroll to 'More Cricket' | Same card, with 'View details' instead of Add to cart | As expected | **Pass** |
| 3.8 | Not-found page for an unknown id | Open /products/99999 | 'Product not found' | Product not found | **Pass** |
| 3.9 | Stock refreshes every 30 s while the page is open | Open a product; drop its stock to 3 elsewhere; wait 30 s (fake clock) | Page shows 'Only 3 left' without reload | As expected | **Pass** |

### Module 4: Cart, wishlist and notifications

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| 4.10 | Heart changes instantly and rolls back with a toast when saving fails (DEV) | DEV: failure rate 1; click the heart | Heart flips at once, then back, with an error toast | As expected | **Pass** |
| 4.1 | Adding the same product twice merges into one line | Add the same product twice from its card | One cart line, quantity 2 | As expected | **Pass** |
| 4.2 | Badge shows total count | Look at the header cart icon | Badge shows total item count | Cart, 2 items | **Pass** |
| 4.3 | Totals: subtotal, 18% GST, ₹49 shipping at or below ₹999, rupee format, 'You saved' | Cart with ₹873.00 of goods | Subtotal, 18% GST, ₹49 shipping, grand total, 'You saved', rupee format | ₹873.00 + ₹157.14 GST + ₹49.00 = ₹1,079.14, saved ₹166.28 | **Pass** |
| 4.4 | Remove asks in a dialog above the sticky header; Escape and outside click close; focus returns | Click remove; press Escape; click remove; click outside | Dialog above the sticky header; closes each way; focus returns to the button | As expected | **Pass** |
| 4.5 | Cart survives refresh; empty cart links back to shopping | Refresh the cart; remove the last item | Cart survives refresh; empty cart links to shopping; badge hidden | As expected | **Pass** |
| 4.6 | Toasts disappear after 3 s | Add to cart and wait | Toast gone after 3 s | As expected | **Pass** |
| 4.7 | Wishlist page: Move to cart and Remove; persists | Save 2 products, open Wishlist, refresh, Move to cart, Remove | Persists; both actions work | Your wishlist is empty | **Pass** |

### Level-up L4

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| L4.1 | Ten rapid + clicks in the drawer add exactly ten | Open the drawer; click + ten times fast | Quantity rises by exactly 10 | 1 → 11 | **Pass** |
| L4.2 | Drawer, product page 'In your cart' and cart page stay in sync | Check 'In your cart' on the product page; click +; open the cart | All three places show the same number | In your cart: 11 → +1 → cart shows 12 | **Pass** |
| L4.3 | Removing the first row keeps the other rows' quantities | Two cart lines; remove the first | Second line keeps its quantity | As expected | **Pass** |

### Module 5: Checkout

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| 5.1 | Empty submit: first invalid field focused, errors announced | Checkout: submit the empty address step | Focus on Full name; errors announced | 6 fields need attention: Full name, Email, Phone, Address, City, PIN code. | **Pass** |
| 5.2 | Validation on blur (email, phone, PIN) | Type a 5-digit phone, leave the field | 'Enter a 10-digit phone number' on blur | As expected | **Pass** |
| 5.3 | Billing form sits beside delivery on wide screens | Untick 'Billing same as delivery' at 1280 px | Billing form beside the delivery form | As expected | **Pass** |
| 5.4 | Enter submits a step; Back keeps the input | Fill the address, press Enter; then Back | Enter submits; Back shows the saved address | saved address: Aditi Rao | **Pass** |
| 5.5 | Saved addresses can be edited and deleted | Edit the saved address's city | Saved and shown | edited city to Mysuru (delete covered in Account → Addresses, 7.3) | **Pass** |
| 5.6 | Card: 16 digits and expiry in the future | Card: 12 digits, 01/21, 2-digit CVV | Three errors; COD continues to Review | As expected | **Pass** |
| 5.7 | Review has an Edit link for each step | Review step | Edit link for delivery, billing and payment | As expected | **Pass** |
| 5.8 | Offline: banner and Place order disabled | Go offline on Review | Offline banner; Place order disabled | As expected | **Pass** |
| 5.9 | Order placed once despite ~1/3 failures; lands on confirmation | Place order, clicking again after each simulated failure | One order; confirmation page | ORD-L4PBC8 after 3 click(s) | **Pass** |

### Module 6: Order confirmation and tracking

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| 6.1 | ORD- + 6 characters; savings row under each discounted item; cart cleared | Confirmation page | ORD- + 6 characters; savings row under discounted items; cart empty | 4 table rows | **Pass** |
| 6.2 | Refresh shows the same order; only one order was created | Refresh; open Account → Orders | Same order; exactly one order | As expected | **Pass** |
| 6.3 | Print hides header, footer and buttons | Print preview (print media) | Header, footer and buttons hidden | As expected | **Pass** |
| 6.4 | Cancel with a live countdown in the first 60 s | Click Cancel within 60 s | Countdown shown; order cancelled | Cancel available for 58s | **Pass** |
| 6.5 | Opening confirmation without an order redirects home | Open /order-confirmation/ORD-XXXXXX | Redirects home | As expected | **Pass** |
| 6.6 | Status moves Placed → Packed → Shipped → Delivered every 20 s | Order placed 5 s ago; advance 20 s at a time (fake clock) | Placed → Packed → Shipped → Delivered | Placed → Packed → Shipped → Delivered | **Pass** |
| 6.7 | Correct status when opened hours later | Advance 3 hours, refresh | Delivered | Delivered | **Pass** |

### Level-up L7

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| L7.1 | Price changed in another tab: order refused, new price shown, details kept | On Review, change a cart item's price as store manager in another tab | Old and new price shown; Place order disabled until accepted; details kept | Cricket Batting Pads (Pair) is now ₹999.99 (was ₹710.50). Place order blocked until "Use the new prices" | **Pass** |
| L7.2 | Stock dropped below the cart quantity: stopped, with a fix | Drop that item's stock to 1 (cart has 2); Place order | Stopped: 'you asked for 2, 1 left' with 'Change to 1' | Cricket Batting Pads (Pair) : you asked for 2, 1 left. | **Pass** |

### Module 7: Account and preferences

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| 7.1 | Delivery PIN set once is used on product, cart and checkout | Set PIN 400001 in the header; visit product, cart, checkout | Used on all three | As expected | **Pass** |
| 7.2 | Account: shared layout, three nested pages with URLs, active item marked | Open /account; click Addresses, Preferences | Opens Orders; each page has its URL; active item marked | As expected | **Pass** |
| 7.3 | Addresses page adds and deletes (same list as checkout) | Account → Addresses: add, then delete | Works; same list as checkout | As expected | **Pass** |
| 7.4 | Dark theme applied before the page is shown (no flash) | Choose Dark; reload with the app script delayed 1.5 s | data-theme=dark before the app runs (no flash) | data-theme=dark set before the app script ran | **Pass** |
| 7.5 | System theme follows the OS live | Choose System; switch the OS theme | Page follows live | As expected | **Pass** |
| 7.6 | Checkout, Account and admin code loads only when first opened | Load home, then open /checkout; watch network | Checkout code loads only when opened | home: 0 lazy chunks; /checkout: Checkout-DEeheqiG.js, Checkout-ceLbOnOS.css | **Pass** |

### Module 8: Store manager admin

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| 8.9 | Admin change shows in an already open shopper tab | Shopper tab open on a product; change its price in the admin tab | Shopper tab shows the new price without reload | As expected | **Pass** |
| 8.1 | Shoppers get a sign-in prompt; switching role returns to the asked page | As shopper open /admin?edit=2; tick Store manager | Sign-in prompt, then back to /admin?edit=2 | As expected | **Pass** |
| 8.2 | A then B shows B's values | Edit product 2, then choose product 1 | Form shows product 1's values only | "Kashmir Willow Cricket Bat" → "English Willow Cricket Bat" | **Pass** |
| 8.3 | Unsaved changes ask before leaving | Change the title, click a header link | 'Discard changes?' dialog; Keep editing stays | As expected | **Pass** |
| 8.4 | Save shows Saving… and field errors appear next to fields | Clear title, price -5, Save; then fix and Save | Errors next to fields; Saving… then saved | Saving… seen, then saved | **Pass** |
| 8.5 | Image pick shows a preview; stored image survives refresh | Pick 5 images one after another; Save; refresh the product page | Preview each time; saved image shown after refresh | picked 5 images in a row; saved image shown from IndexedDB after refresh | **Pass** |
| 8.6 | Table sorts, searches, paginates | Sort by Price; search 'yoga' | Ascending prices; filtered rows; pagination | sorted by price ascending; "yoga" → 10 rows; Page 1 of 2 | **Pass** |
| 8.7 | Bulk delete: Undo keeps everything; waiting deletes | Delete 2 and Undo; delete 1 and wait 6 s | Undo keeps all; waiting deletes one | 62 → Undo → 62; delete 1 and wait → 61 | **Pass** |

### Cross-cutting

| ID | Check | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| X.1 | First Tab reaches 'Skip to content', which moves focus to main | Press Tab once on a fresh page, then Enter | 'Skip to content' focused; focus moves to main | As expected | **Pass** |
| X.2 | page_view logged once per page visit | Visit a page, change filters on it | One page_view per page, none per filter change | As expected | **Pass** |
| X.3 | No console errors or warnings during these runs | Watch the console through the runs | No errors or warnings | As expected | **Pass** |
