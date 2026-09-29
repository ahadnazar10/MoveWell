# MoveWell — Team

MoveWell merges three individual capstone stores. Each associate brought one original
category and owns one shared layer of the merged app.

## Members

- Ahad Nazar
- Meghaa Sunil
- Sajay T

## Ownership

_To confirm: put each member's name against the store they brought and the layer they own._

| Associate | Original category (store) | Shared layer owned | Responsibilities |
|---|---|---|---|
| _Name_ | Sports (FitArena) | _e.g. Data service & merge script_ | _e.g. `productsService.js`, `scripts/merge-products.mjs`, catalogue tests_ |
| _Name_ | Footwear (StrideHub) | _e.g. UI / design system_ | _e.g. tokens in `index.css`, Header, Home, ProductCard, responsive checks_ |
| _Name_ | Health (MediKart) | _e.g. Redux state & features_ | _e.g. `profileSlice`, Fitness Goals, Kits, cart integration, health data quality_ |

<!-- Add or remove rows as needed. Replace every _italic_ placeholder. -->

## Shared layers in the codebase

Use these when filling in "Shared layer owned":

| Layer | Main files |
|---|---|
| Product data & merge | `scripts/merge-products.mjs`, `src/data/*.json`, `src/data/kits.js` |
| Data service | `src/services/productsService.js`, `simulate.js`, `ordersService.js` |
| Redux state | `src/app/store.js`, `src/features/*` (one `productsSlice`, one `cartSlice`, `profileSlice`, …) |
| Routing & pages | `src/App.js`, `src/pages/*` |
| UI components & design system | `src/index.css`, `src/components/*` |
| Admin | `src/pages/admin/*`, `src/features/admin/*` |
| Testing | `src/**/__tests__/*`, `e2e/selftest.mjs` |
| Documentation | `docs/MERGE.md`, `docs/CONFLICTS.md`, this file |

## Working agreements

_Fill in: branching model, review rules, who approves merges to main, meeting cadence._
