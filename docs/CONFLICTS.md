# MoveWell — Integration conflicts

Only conflicts actually met while merging StrideHub and MediKart into the FitArena
codebase are listed. Where an area had no conflict, that is stated.

## 1. Product ids: string vs integer

**Conflict.** FitArena ids are integers (`1`–`62`). StrideHub uses `"prod-001"`…,
MediKart `"p-001"`…. FitArena parses ids with `Number(id)` in the URL, service,
cart, wishlist, recently viewed, reviews and orders, and validates stored carts with
`Number.isInteger`. String ids would have been rejected everywhere.

**Resolution.** Integer ids in per-store ranges: FitArena unchanged, StrideHub
`1000 + n`, MediKart `2000 + n`. The original id is kept as `sourceId` and the
store as `source`. `scripts/merge-products.mjs` fails the merge if two products map
to one id. Because FitArena's ids did not change, carts and orders already saved in
browsers still resolve to the right products.

## 2. `category` meant three different things

**Conflict.** Each store used `category` for its own sub-types ("Cricket",
"Sandals", "First aid"). MoveWell needs `category` to be the department. FitArena's
UI, tests and the Playwright self-test link to `/products?category=Cricket`.

**Resolution.** `category` is now `sports | footwear | health`; the store value
moved to `subcategory`. The service treats a non-department `category` value as a
subcategory, so old links still work (they show the Cricket type under Sports).

## 3. MediKart specs copied across whole categories

**Conflict.** In `MediKart.json`, `Composition`, `Dosage form` and `Pack size` are
identical for every product in a category. Examples: *Ibuprofen 400mg* lists
"Composition: Paracetamol 500mg"; *Muscle Spray* and *Pain Relief Gel* list
"Dosage form: Tablet"; *Vitamin D3 Drops* lists "Pack size: 60 tablets". Showing
these as product specifications would state wrong medicine facts, which conflicts
with the "no medical claims" rule.

**Resolution.** The merge script checks, per MediKart category, whether each of
those three keys has one value for every product. Any key that does is moved from
`specs` to `sourceCategorySpecs`, so the data is kept but not shown. `Manufacturer`,
`Storage instructions` and `Expiry period` stay visible. When correct per-product
values are available, put them in `specs` and they will appear (as "Product type",
"Quantity" and "Composition").

## 4. Missing image files for footwear and health

**Conflict.** StrideHub paths (`/images/runpro-elite.jpg`) and MediKart paths
(`/images/products/p-002.svg`) point to files that were not supplied. Every
footwear and health card would have shown "Image unavailable".

**Resolution.** The merge script generates a simple illustrated SVG per product
(name, type, brand) in `public/images/footwear/` and `public/images/health/`, and
points `thumbnail` / `images` at them. FitArena photos are unchanged. The existing
placeholder-on-error behaviour still covers any broken path.

## 5. Browser storage written by the FitArena build

**Conflict (data compatibility).**

- Admin edits saved by FitArena have `category: "Cricket"` and no `subcategory` or `goals`.
- The admin `nextId` counter saved by FitArena (63 and up) will eventually run into
  the new id ranges (1001+).
- Renaming the `fitarena:` localStorage prefix would silently empty every existing cart.

**Resolution.**

- `productsService` reads old records into the new schema (`sports` / `Cricket`,
  `goals: []`).
- `createProduct` skips any id the merged seed already uses.
- The `fitarena:` prefix, the BroadcastChannel name and the IndexedDB name are kept.
  They are internal keys and are never shown to shoppers.

## 6. Missing `discountPercentage`

**Minor.** 4 FitArena and 18 MediKart products omit the field. FitArena's pricing
already treats "missing" as 0, so there was no runtime conflict; the merged file
stores `0` for a uniform schema.

## 7. Tests written against the FitArena catalogue

**Conflict.** `productsService.test.js` expected six categories including "Cricket"
and filtered `category: "Yoga"`, which the new department meaning broke.

**Resolution.** These tests were updated to the new meaning, and new tests were added for:

- the department, type and goal filters
- the legacy link mapping
- merge integrity (178 products, unique ids, id mapping)
- old admin records
- recommendations and kits
- `addKitToCart`
- `profileSlice`

`e2e/selftest.mjs` (Playwright) still uses `?category=Cricket` links, which keep working through the legacy mapping. Its admin-form steps choose the old category names and need updating. See §9.

## 8. Areas with no conflict

- **Cart and checkout.** The cart stores `{ productId, quantity }` and totals come from `computeTotals`. Both work unchanged for any category, so there was no conflict and no second cart.
- **Orders, reviews, wishlist, addresses.** All are keyed by product id, so there was no conflict once ids stayed integers (§1).
- **Pricing and currency.** All three datasets use rupees with paise, so no conversion was needed.
- **Field names.** All three datasets use the same keys, so there was no renaming conflict.
- **Routing.** The categories fit the existing `/products` query-string design, so there were no route clashes.

## 9. Open items for the team

- **StrideHub and MediKart code.** Fill in the state, routing and styling comparison in `MERGE.md` §4 from the original repositories. Only their product data was available here.
- **Real product photos.** Replace the generated footwear and health SVGs with real photos when they are available.
- **MediKart specs.** Correct the per-product `Composition`, `Dosage form` and `Pack size` values (§3).
- **Playwright self-test.** Update `e2e/selftest.mjs` for MoveWell and re-run it: the admin steps (new Category select and Type field), the hero-carousel checks (the home page no longer uses it) and the 62-product counts. `TEST_PLAN.md` §3 lists each affected check and the new MoveWell checks to add.
- **axe and Lighthouse.** Re-run on the MoveWell production build. The figures in `TEST_PLAN.md` §2 are from the FitArena build.
