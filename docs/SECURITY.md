# FitArena: Security Checklist (SECURITY.md)

| Check | Status | How |
|---|---|---|
| No secrets committed | Done | The app has no keys or tokens. `.env.*` files hold only service delay and failure-rate defaults. |
| User-written content can never run as code | Done | Reviews, addresses and admin text are rendered as JSX text, which React escapes. No `dangerouslySetInnerHTML` anywhere. Review text is stored and shown exactly as typed, HTML included, as plain text. |
| Stored data is validated when read back | Done | `readStorage(key, fallback, validate)` returns the fallback for missing, corrupt or wrong-shaped data. Cart, wishlist, recently viewed, orders, reviews, addresses, admin edits, theme, role, PIN and the cross-tab messages are all checked (`utils/storage.js`, `validators`). Old address shapes are migrated on read. |
| Payment details never stored | Done | Card number, expiry and CVV live only in the checkout reducer's memory, are never written to storage or sent in the order, and are cleared after the order is placed. The order records only the method ("card" or "cod"). |
| Redirects stay on this site | Done | The sign-in page only returns to same-site paths (`utils/safeReturnPath.js`): full URLs, `//host` and backslashes are refused. Tested. |
| Uploaded files are checked | Done | Admin image picks accept image types only, up to 5 MB each. |
| npm audit run and results noted | Done | See below. |
| AI-suggested dependencies checked on npm before installing | Partly | `@phosphor-icons/react` was confirmed to exist on npm with `npm view` (name and latest version) before installing. `playwright` is Microsoft's official package, added as a dev dependency on request. A fuller review (publisher, downloads, repository) is still to do. |

## npm audit (26 September 2026)

`npm audit` reports 7 findings (1 critical, 1 high, 5 moderate). Every fix needs a major-version upgrade (`npm audit fix --force`), so none were applied automatically.

| Package | Severity | Ships to users? | Assessment |
|---|---|---|---|
| vitest, @vitest/mocker, vite-node | critical / moderate | No (tests only) | Affects the Vitest UI server and mocking; the project does not run the UI server. Upgrade to Vitest 5 when convenient. |
| vite, esbuild | high / moderate | No (dev server) | Dev-server file access issues. Only run `npm run dev` on a trusted network. Upgrade to Vite 8 when convenient. |
| react-router, react-router-dom | moderate | Yes | Open redirect via a backslash in `<Link>`/`navigate`, and an SSR-only issue (the app has no SSR). The one place the app navigates to a URL from the query string is guarded by `safeReturnPath`. Upgrade to React Router 7 is recommended. |

Recommended next step: upgrade React Router, Vite and Vitest together on a branch, then re-run `npm test`, `npm run lint` and the Playwright checks.
