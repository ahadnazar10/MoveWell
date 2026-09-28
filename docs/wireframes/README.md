# Wireframes

Layout wireframes for every page, at desktop (1280 px) and phone (390 px) width.

**How these were made.** The original Step 1 planning wireframes were not kept in the repository. These were captured from the built app on 27 September 2026: greyscale, photos reduced to grey boxes, sample data seeded (a cart, a wishlist, an order and a saved address). They show the layout as built, and they are what the self-test in `docs/TEST_PLAN.md` was run against.

| Page | Route | Desktop | Phone |
|---|---|---|---|
| Home | `/` | [01-home-desktop](01-home-desktop.jpg) | [01-home-mobile](01-home-mobile.jpg) |
| Catalogue | `/products?category=Cricket` | [02-catalogue-desktop](02-catalogue-desktop.jpg) | [02-catalogue-mobile](02-catalogue-mobile.jpg) |
| Product detail | `/products/1` | [03-product-desktop](03-product-desktop.jpg) | [03-product-mobile](03-product-mobile.jpg) |
| Cart | `/cart` | [04-cart-desktop](04-cart-desktop.jpg) | [04-cart-mobile](04-cart-mobile.jpg) |
| Wishlist | `/wishlist` | [05-wishlist-desktop](05-wishlist-desktop.jpg) | [05-wishlist-mobile](05-wishlist-mobile.jpg) |
| Checkout (Address step) | `/checkout` | [06-checkout-address-desktop](06-checkout-address-desktop.jpg) | [06-checkout-address-mobile](06-checkout-address-mobile.jpg) |
| Order confirmation | `/order-confirmation/:id` | [07-order-confirmation-desktop](07-order-confirmation-desktop.jpg) | [07-order-confirmation-mobile](07-order-confirmation-mobile.jpg) |
| Account: Orders | `/account/orders` | [08-account-orders-desktop](08-account-orders-desktop.jpg) | [08-account-orders-mobile](08-account-orders-mobile.jpg) |
| Account: Addresses | `/account/addresses` | [09-account-addresses-desktop](09-account-addresses-desktop.jpg) | [09-account-addresses-mobile](09-account-addresses-mobile.jpg) |
| Account: Preferences | `/account/preferences` | [10-account-preferences-desktop](10-account-preferences-desktop.jpg) | [10-account-preferences-mobile](10-account-preferences-mobile.jpg) |
| Sign-in prompt | `/sign-in?from=/admin` | [11-sign-in-desktop](11-sign-in-desktop.jpg) | [11-sign-in-mobile](11-sign-in-mobile.jpg) |
| Admin table | `/admin` | [12-admin-desktop](12-admin-desktop.jpg) | [12-admin-mobile](12-admin-mobile.jpg) |
| Admin edit form | `/admin?edit=1` | [13-admin-edit-desktop](13-admin-edit-desktop.jpg) | [13-admin-edit-mobile](13-admin-edit-mobile.jpg) |
| Not found | any unknown URL | [14-not-found-desktop](14-not-found-desktop.jpg) | [14-not-found-mobile](14-not-found-mobile.jpg) |

Not captured as separate images: the Payment and Review checkout steps (same two-column layout as the Address step), the mini-cart drawer and dialogs (they overlay the page), and dark mode (same layout, different colours).

**Layout rules visible in the wireframes**
- Header: red announcement bar (PIN, role, theme) above a dark bar (logo, sport links, search, account, wishlist and cart icons). On phones the search and links drop to their own rows.
- Product grids: 4 columns on desktop, 2 on tablets, 1 on phones.
- Two-column pages (catalogue, product, cart, checkout, account) stack to one column below 1024 px (account: 760 px).
- No page scrolls sideways at 360 px or wider. Only the admin table scrolls inside its own box.
