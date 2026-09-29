# MoveWell: AI Code Review of Cart and Checkout (CODE_REVIEW.md)

This review was done on the FitArena codebase before the MoveWell merge. Its fixes still stand, because MoveWell keeps FitArena's one cart and checkout for every department (`MERGE.md` §6). The only cart change in the merge is covered after the table.

**Reviewer:** Claude (Claude Code), 27 September 2026.
**Scope:** `features/cart/cartSlice.js`, `pages/Cart.js`, `components/MiniCartDrawer.js`, `components/ProductCard.js` (add to cart), `pages/Wishlist.js` (move to cart), `features/checkout/checkoutReducer.js`, `features/checkout/checkoutValidation.js`, `pages/Checkout.js`, `services/ordersService.js`.
**Method:** read the code against the brief's Module 4 and 5 rules and level-ups L4 and L7, then ran the Playwright self-test (`docs/TEST_PLAN.md`), which surfaced two more findings (CR-5, CR-6).

Every comment is listed with the response: **Fixed** (with the change and the proof) or **Rejected** (with the reason).

| # | Area | Comment | Response |
|---|---|---|---|
| CR-1 | Cart | The Add to cart button on cards and "Move to cart" on the Wishlist add 1 without checking what is already in the cart, so repeated clicks can put more units in the cart than exist. Checkout would catch it, but only at the last step. | **Fixed.** New `addToCart(product)` thunk caps the line at stock and reports `{ added, inCart }`; the button shows "You already have all N in your cart" instead. `addItem` also accepts `max`. Test: `cartSlice.test.js` "never adds beyond the product's stock". |
| CR-2 | Orders service | `placeOrder` saved the subtotal, GST, shipping and total sent by the page. A real backend would never trust client totals. | **Fixed.** The service recomputes totals from the verified catalogue prices with `computeTotals`. Test: `ordersService.test.js` "recomputes totals from catalogue prices instead of trusting the page". |
| CR-3 | Checkout | If the selected saved address is deleted in another tab, the Address step continues and Review shows a blank address. | **Fixed.** On Continue, a missing saved address switches to the new-address form with a message. |
| CR-4 | Cart | If stock drops below a cart line's quantity while the cart is open (admin edit in another tab), nothing tells the shopper until checkout. | **Fixed.** The row says "Only N left. Lower the quantity to check out." (or "Now out of stock") and Proceed to checkout is disabled until it is resolved. |
| CR-5 | Checkout | `SavedAddressEditor` was a `<form>` inside the Address step's `<form>`. Nested forms are invalid HTML, React logs a warning, and the Save button's behaviour depends on the browser. Found by self-test 5.5. | **Fixed.** The editor is a `role="group"` with a Save button and Enter-to-save on its inputs. Self-test 5.5 passes and the console stays clean. |
| CR-6 | Checkout (L7) | Cross-tab sync reloads changed products, so a store manager's price change silently updated the Review step's prices. Placing the order then charged the new price, which the shopper may not have noticed. The service's 409 check never fired because the page already had the new price. Found by self-test L7.1. | **Fixed.** Review records the prices on screen when it opens. If any change, a notice lists old and new prices and Place order stays disabled until the shopper chooses "Use the new prices". The service 409 remains as the final check. Self-test L7.1 passes. |
| CR-7 | Checkout | Double clicks or a held Enter could start two place-order attempts before the button disables. | **No change needed.** A ref guard (`placingRef`) blocks re-entry synchronously, and every retry reuses one `clientOrderId`, so the service returns the existing order instead of creating another. Tested: `ordersService.test.js` "is idempotent". |
| CR-8 | Cart (L4) | `+` computed `value + 1` from the rendered value in the original code; fast clicks between renders could be lost. | **No change needed** (already fixed earlier): buttons dispatch `changeQuantity({ delta })`. Tested: ten rapid clicks add exactly ten (unit test and self-test L4.1). |
| CR-9 | Checkout | Card number, expiry and CVV are in reducer state. Check they are never persisted. | **No change needed.** The checkout reducer is not persisted, the order payload contains only `paymentMethod`, and `clearCard` runs after success. Tested: `checkoutReducer.test.js` "clears card details after the order is placed". |
| CR-10 | Checkout | Stock re-check calls `getStock` one item at a time. | **No change needed** (already parallel): `Promise.all` of one `getStock` per item, and a failure stops with a retry message rather than being ignored. |
| CR-11 | Architecture | Move the checkout draft into Redux so it survives navigating away (Level-up L8). | **Rejected.** L8 was not chosen. Keeping the draft local means card details can never leak into persisted state, and nothing else reads the draft. |
| CR-12 | Architecture | Replace the thunks with RTK Query for caching and retries. | **Rejected.** The product cache plus `fetchProduct`'s `condition` already gives cache-first loads. RTK Query would add a second data layer and change every page for no user-visible gain. |
| CR-13 | Cart | Cart rows are keyed by `productId`; consider index keys for simplicity. | **Rejected.** Index keys would make the quantity inputs keep the wrong row's draft after a removal (brief L4). Self-test L4.3 checks this. |
| CR-14 | Validation | Phone numbers with a +91 prefix fail validation. | **Rejected for now.** The brief asks for a 10-digit phone; spaces are accepted, a country code is not. Recorded as a possible improvement. |

## MoveWell merge: what changed in the reviewed code

The merge added one entry point to the cart and nothing to checkout or the orders service.

- **`addKitToCart(products)`** (`cartSlice.js`) adds a MoveWell Kit. It dispatches the existing `addToCart` once per product, so CR-1's stock cap applies to every kit item. Out-of-stock items are skipped and reported, and `KitCard` tells the shopper how many were added and how many were already at the stock limit. Test: `cartSlice.test.js` "adds a cross-category kit as ordinary lines in the one shared cart".
- **No bundle price.** A kit's total is the sum of its items, so CR-2 (totals recomputed by the service) and L7's 409 check work unchanged.
- **Product ids** stayed integers (`CONFLICTS.md` §1), so the cart, wishlist and order validators needed no change.

This part has not had a separate review pass. It is listed here so the next review covers it.
