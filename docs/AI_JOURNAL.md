# MoveWell: AI Journal (AI_JOURNAL.md)

How AI assistants were used on MoveWell and on FitArena, the codebase it is built on: what was kept, changed or rejected, and where the AI was wrong. Entries 1 to 4 cover the four uses the FitArena brief requires (boilerplate, debugging, documentation, refactoring), and section 5 lists the "Caught it" cases from that work. Section 6 covers the MoveWell merge.

Assistants: Antigravity (early refactoring session, section 0) and Claude (Claude Code) for the FitArena redesign and requirements pass on 26 and 27 September 2026, and for the MoveWell merge (section 6).

---

## 0. Earlier session (Antigravity): custom hooks and middleware

- **Goal:** pull repeated logic into hooks and one custom Redux middleware.
- **Output:** `usePersistedReducer`, `useDebouncedValue`, `usePageView`, and `persistenceMiddleware` (debounced writes plus BroadcastChannel).
- **Kept:** `useDebouncedValue`, `usePageView` and the middleware (all still in use; `usePageView` later fixed to log once under StrictMode).
- **Rejected later:** `usePersistedReducer` was never used anywhere and was deleted on 26 September. Persistence is done by the middleware instead.

---

## 1. Boilerplate

**Goal.** Scaffold the pieces the requirements pass needed: a thunk helper that keeps service error codes, the Account area's nested routes, and a protected admin route.

**Prompt.** "make sure all the requirements given in the docs\09_Sports_and_fitness_FitArena.docx satisfy…"

**Summary of the output.** Claude generated `features/serviceThunk.js` (createAsyncThunk plus `rejectWithValue` so a 404 can be told apart from a 500), the `/account` route tree with `orders`, `addresses` and `preferences` children, `RequireStoreManager` with a `?from=` return path, and the `SignIn` page.

**Kept, changed or rejected, and why.**
- Kept `serviceThunk`: plain createAsyncThunk drops `status`, so the product page could not show "not found" for a 404.
- Changed the sign-in return path check after `npm audit` flagged React Router's backslash open-redirect advisory (see Caught it C4).
- Kept the routes; added a redirect from the old `/orders` URL so existing links still work.

---

## 2. Debugging (real bugs)

### Bug 1: every storage test failed on Node 26

- **Error:** `TypeError: Cannot read properties of undefined (reading 'clear')` at `window.localStorage.clear()`, plus Node's warning "localStorage is not available because --localstorage-file was not provided". 17 of 31 tests failed.
- **Prompt:** asked Claude to find out whether the failures were caused by the redesign.
- **Claude's diagnosis:** Node 22+ defines its own experimental global `localStorage`, which is `undefined` without a flag and shadows jsdom's working Storage. Confirmed with a probe test that printed `typeof window.localStorage` as `undefined`.
- **Fix:** `src/test/setup.js` points `localStorage` and `sessionStorage` back at jsdom's implementation. All 31 tests passed again.

### Bug 2: a test worker crashed with "Worker exited unexpectedly"

- **Error:** Vitest reported `Error: Worker exited unexpectedly` and a Node fatal error (out of memory) in the orders tests.
- **Prompt:** asked Claude why only the orders tests crashed.
- **Claude's diagnosis:** the new unique-order-id loop re-rolled `Math.random()` until the id was unused. The test mocks `Math.random` to a constant, so every roll produced the same id and the loop never ended. It is also a real risk, not just a test artifact.
- **Fix:** ids now start from a random point and step forward on a collision, so the loop always ends (`generateOrderId` in `ordersService.js`).

### Bug 3: a cart change was lost when the page refreshed straight away

- **Symptom:** the Playwright run added an item and immediately opened `/checkout`; checkout said the cart was empty.
- **Claude's diagnosis:** the persistence middleware debounces writes by 150 ms, and a navigation within that window threw the pending write away.
- **Fix:** pending writes are flushed on `pagehide` and when the tab is hidden (`persistenceMiddleware.js`). Recorded as edge case 23.

### Bug 4: the first test run after any edit took about 2.5 minutes and timed out

- **Error:** `Test timed out in 120000ms` for the full-purchase integration test, only on the first run after files changed; a second run passed in 15 s.
- **Claude's diagnosis:** at first Claude blamed the OneDrive-synced folder (see Caught it C6). Measuring again showed the real cause: `@phosphor-icons/react`'s entry imports about 4,500 separate files, which Vitest loaded one by one on a cold cache.
- **Fix:** `vite.config.js` tells Vitest to pre-bundle the icon library. Cold run: 158 s → 8 s.

---

## 3. Documentation

**Goal.** JSDoc for the custom hooks and data service, a first README draft, and the decision and coverage documents.

**Prompts.** "create a doc file saying why you went with the approach, how is it better and what other alternatives you considered"; "make sure these docs are correct and up to date".

**Summary of the output.** JSDoc on every hook in `src/hooks/` and on the main service and storage functions (`readStorage`, `getProducts`, `getCatalogueFacets`, `placeOrder`, `serviceThunk`, …); `README.md`; `docs/APPROACH_DECISIONS.md` and its `.docx` copy (neither is in the MoveWell repository; the decisions are in `ADR.md`); rewrites of `architecture.md`, `CHALLENGES.md`, `TEST_PLAN.md`, `SECURITY.md`, `EDGE_CASES.md` and `CODE_REVIEW.md`; `docs/wireframes/`.

**Kept, changed or rejected, and why.**
- Kept the structure and the measured numbers (tests, Lighthouse, self-test).
- Changed several earlier documents that claimed things the code did not do (tests that did not exist, an Undo "banner", the old L7 flow). Documentation now describes the code as it is.
- Rejected writing peer-test results, the screen-reader check and the personal reflection: those must come from people (see C5).

---

## 4. Refactoring: Tabs matched by value instead of position

**Goal.** The brief says the page must be able to arrange the tab list and panels freely. The old Tabs component matched panels to tabs by their order.

**Prompt.** Part of the requirements pass: "make sure all the requirements … satisfy".

**Before** (index-based, panels had to sit inside `TabPanels` in the same order as the tabs):

```jsx
export function TabPanels({ children }) {
  return React.Children.map(children, (child, index) =>
    React.cloneElement(child, { index })
  );
}
// <TabList><Tab>Description</Tab>…</TabList>
// <TabPanels><TabPanel>…</TabPanel>…</TabPanels>
```

**After** (each tab and panel names its value, so they can be anywhere inside `<Tabs>`):

```jsx
export function TabPanel({ value, children }) {
  const context = useTabsContext("TabPanel");
  if (context.value !== value) return null;
  return <div role="tabpanel" id={panelId(context.baseId, value)} …>{children}</div>;
}
// <Tab value="reviews">Reviews</Tab> … <TabPanel value="reviews">…</TabPanel>
```

**Why it is better.** No `cloneElement` or `Children.map`, so wrappers between the list and panels no longer break it. The page can put panels before the list, and adding or reordering a tab can't attach the wrong panel. `Tabs.test.js` renders the panels before the tab list and out of order to prove it.

---

## 5. Caught it: where Claude was wrong or risky

| # | What Claude did | How it was caught | What was done |
|---|---|---|---|
| C1 | Added `// eslint-disable-next-line react-hooks/exhaustive-deps` twice (header live search, checkout address preselect). The brief says the Hooks rules are never disabled. | Reading the diff against the brief's cross-cutting rules. | Removed both; used a "latest values" ref and a run-once ref with full dependency lists. `grep eslint-disable src` returns nothing. |
| C2 | First version of `useMinimumDelay` returned `true` on the first render whenever the key was `null`, so the loader could skip its 1.5 s minimum. | Reading the return expression before running it. | Rewritten with a sentinel and `Object.is`; covered by `hooks.test.js`. |
| C3 | Wrote in `SECURITY.md` that dependencies had been checked on npm for publisher and weekly downloads. Only `npm view` (name and version) had been run. | Checking the claim against the commands actually run. | Corrected to "Partly", saying exactly what was checked. |
| C4 | The sign-in `?from=` check allowed `/\evil.example`, which browsers treat as `//evil.example`: an open redirect. | `npm audit` listed React Router's backslash open-redirect advisory; the check was re-read with that input. | `utils/safeReturnPath.js` rejects backslashes and `//`; tested. |
| C5 | The existing `PEER_TESTS.md` contained results from "Peer Evaluator A and B" that no person produced (written by an earlier AI session). | Comparing it with the brief, which requires named interns, screenshots and verification by the peer who found each issue. | Not treated as evidence. Flagged for replacement with real peer reports. |
| C6 | Blamed the slow first test run on the OneDrive-synced folder and raised a timeout instead of finding the cause. | The same pattern returned; timing a cold run showed thousands of icon modules being loaded. | Root cause fixed (Debugging bug 4) and the timeout put back to 30 s. |
| C7 | A global `.section { padding: 48px 0 }` rule silently removed `.container`'s side padding, so page content touched the screen edges at 1280 px. | Screenshot review at 1280 px. | Changed to `padding-block`. |
| C8 | In the first self-test run, 15 checks "failed" and the script crashed before the admin checks. Most were mistakes in Claude's own test script (wrong selectors, not waiting for data, seeding that wiped storage in every new tab). | Each failure was reproduced by hand before changing app code. | Only real app issues were fixed (CR-5, CR-6 in `CODE_REVIEW.md`); the script was corrected for the rest. Final run: 78/78. |

---

## 6. MoveWell merge

**Goal.** Turn FitArena into MoveWell, one shop for Sports, Footwear and Health, without losing any FitArena feature.

**Approach given to Claude.** Use FitArena as the base. Give Claude the FitArena, StrideHub and MediKart `products.json` files, merge them into one unified catalogue and keep the existing FitArena functionality. Then turn the app into MoveWell by adding the three categories, a new home page and features that span categories: Fitness Goals and MoveWell Kits.

**Summary of the output.**
- `scripts/merge-products.mjs`, which builds `src/data/movewell-products.json` (178 products) and generated SVG images for Footwear and Health. The source JSON files are not modified.
- The unified schema: `category` = department, the store's own category in `subcategory`, integer ids in per-store ranges, and `goals`, `source` and `sourceId` fields (`MERGE.md` §3).
- Extensions to the existing layers instead of new ones: `productsService` (department, type and goal filters, recommendations, kits), `productsSlice` (recommendations and kits), `addKitToCart`, a new `profileSlice`, the `/goals` and `/kits` routes, the new home page, category-aware cards, filters, product page and admin form, and re-themed design tokens (`MERGE.md` §5).
- Updated and new unit tests: 93 → 104, all passing.
- `docs/MERGE.md`, `docs/CONFLICTS.md` and `docs/TEAM.md`, plus updates to the other docs so they describe MoveWell.

**Data problems found during the merge** (details and fixes in `CONFLICTS.md`):
- String ids in StrideHub and MediKart, which every FitArena layer would have rejected.
- `category` meaning something different in each store.
- MediKart `Composition`, `Dosage form` and `Pack size` copied across whole categories (e.g. Ibuprofen listed as "Paracetamol 500mg"). These are hidden rather than shown as product facts.
- Image files for Footwear and Health not supplied.
- Browser data saved by the FitArena build (admin edits, `nextId`, the `fitarena:` storage prefix).

**What is still open.**
- `MERGE.md` §4 (StrideHub and MediKart state, routing and styling) needs their original repositories. Claude did not describe code it had not seen.
- The Playwright self-test was not updated or re-run for MoveWell (`TEST_PLAN.md` §3).

**Kept, changed or rejected, and why.** _Team to fill in: which parts of the merge output were kept as generated, which were changed after review, and anything rejected._
