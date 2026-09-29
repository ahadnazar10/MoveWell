# MoveWell: Level-ups (CHALLENGES.md)

Three level-ups from three different modules: **L2** (Module 2), **L4** (Module 4) and **L7** (Module 5). Each entry gives the problem, how to reproduce it, the fix, and the test that proves it.

These level-ups were built in FitArena, the codebase MoveWell is built on. The merge kept them as they were: search, the cart and checkout are shared by every department, so each fix now covers all 178 Sports, Footwear and Health products. A MoveWell Kit becomes ordinary cart lines (`addKitToCart` calls the stock-capped `addToCart` per product), so L4's quantity rules and L7's price and stock checks apply to kit items too. The unit tests below still pass (`npm test`, 29 September 2026). The self-test runs quoted here were made on the FitArena build (see `TEST_PLAN.md` §3).

---

## L2: Unreliable search (Module 2)

**Problem.** When search calls take a random 0 to 2 seconds, an earlier, slower search ("cric") can finish after a later one ("cricket") and replace the correct results. The screen then disagrees with the search box.

**Reproduce.** Developer controls → "Search delay max (ms)" = 2000. Type "cricket" quickly, pause, then change it to "gym". Without the fix, "cricket" results sometimes appear under "gym".

**Fix.**
- Search calls get their own random 0 to 2 s delay (`productsService.getProducts`, adjustable in the developer controls).
- Typing is debounced (300 ms, `useDebouncedValue` in `Header.js`), so a pause sends one search, not one per keystroke.
- `productsSlice` records the `requestId` of the latest `loadCatalogue` call. Fulfilled or rejected actions from any earlier request are ignored, so only the latest search ever changes the screen.
- The URL is the only store of the query, so the box, the URL and the results always describe the same search.

**Proof.** `hooks.test.js` ("restarts the wait on every change") shows one search per pause. Self-test L2 sets the search delay to 0 to 2 s, types four terms in quick succession, and checks that the screen shows exactly the results of a single clean search for the last term.

---

## L4: Mini-cart drawer (Module 4)

**Problem.** Quantity can be changed in three places: the product page ("In your cart: N"), the mini-cart drawer and the cart page. They must always agree, ten rapid "+" clicks must add exactly ten, and removing the first cart row must not shift quantities onto other rows.

**Reproduce.** Add a product, open the drawer, click "+" ten times as fast as possible, then compare the drawer, the cart page and the product page.

**Fix.**
- All three read the same Redux cart. There is no local copy of quantities.
- "+" and "−" dispatch `changeQuantity({ productId, delta, max })` instead of `setQuantity(value + 1)`. A delta can't be lost to a stale render, and the reducer clamps to 1 to stock.
- Rows are keyed by `productId`, never by index, so removing a row can't move another row's input state.
- The drawer is built on the shared `Modal` shell: focus is trapped inside, Escape closes it, and focus returns to the cart icon.

**Proof.** `cartSlice.test.js` ("adds exactly ten after ten rapid + clicks", "keeps + and − within 1 and the available stock"). Self-test L4.1 (ten rapid clicks in the drawer: 1 → 11), L4.2 (drawer, "In your cart" and cart page agree), L4.3 (removing the first row keeps the other row's quantity).

---

## L7: Prices and stock change (Module 5)

**Problem.** Between adding to cart and placing the order, a store manager can change a price or stock in another tab. The shopper must never be charged a price they did not see, the store must never oversell, and a 409 must be recoverable without re-typing anything.

**Reproduce.** Add a product and go to Review. In a second tab, as store manager, change that product's price (or set its stock below the cart quantity), then return to the first tab and click Place order.

**What went wrong first.** The first version relied on `placeOrder` rejecting a stale price with 409. The self-test showed a gap: cross-tab sync reloads the changed product, so the Review step quietly switched to the new price and the order went through at a price the shopper may not have noticed. The 409 never fired.

**Fix.**
- When Review opens, checkout records the unit prices on screen. If any change afterwards, a notice lists each old and new price and **Place order stays disabled until the shopper chooses "Use the new prices"**.
- Before placing, checkout calls `getStock` once per item, in parallel. Short items are listed with one-click fixes ("Change to 3", "Remove").
- The order carries the unit price shown on the page. `placeOrder` compares every price and quantity with the current catalogue and rejects with **409** and a `conflicts` list when anything changed. This is the final check, inside the service, so no gap is left between checking and ordering.
- On a 409 the page reloads the changed products (new prices and totals appear) and explains what changed. Addresses and payment choice stay, because they live in the checkout reducer.
- Every retry reuses one `clientOrderId`, and a ref guards against double clicks, so the same order is never placed twice.

**Proof.** `ordersService.test.js` ("rejects with 409 and the changed price when the shopper saw an old price", "rejects with 409 when an item doesn't have enough stock", "is idempotent", "recomputes totals from catalogue prices"). Self-test L7.1 (price changed in another tab: notice shown, Place order blocked until accepted, address kept), L7.2 (stock dropped: "you asked for 2, 1 left" with "Change to 1"), 5.9 and 6.2 (placed once through the simulated failures).

---

## Bug-hunt report

To be completed during Step 19 with the mentors' seeded-bug branch.
