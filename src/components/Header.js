import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  GearSixIcon,
  HandbagIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PersonSimpleRunIcon,
  TruckIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useLocationPin } from "../context/LocationContext.js";
import { useTheme } from "../context/ThemeContext.js";
import { useRole } from "../context/RoleContext.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { selectCartCount } from "../features/cart/cartSlice.js";
import { selectWishlistIds } from "../features/wishlist/wishlistSlice.js";
import { toggleCartDrawer } from "../features/ui/uiSlice.js";
import { FREE_SHIPPING_ABOVE } from "../utils/pricing.js";
import { DEPARTMENTS } from "../utils/catalogue.js";
import styles from "./Header.module.css";

// MoveWell primary navigation. Department links reuse the one catalogue
// route (/products?category=…); Goals and Kits are their own pages.
const NAV_LINKS = [
  { label: "Home", to: "/", path: "/" },
  { label: "Shop all", to: "/products", path: "/products", category: "" },
  ...DEPARTMENTS.map((d) => ({
    label: d.label,
    to: `/products?category=${d.value}`,
    path: "/products",
    category: d.value,
  })),
  { label: "Fitness goals", to: "/goals", path: "/goals" },
  { label: "Kits", to: "/kits", path: "/kits" },
];

const SEARCH_DEBOUNCE_MS = 300;

/** True when a keystroke is going into a text field, so "/" should type a slash. */
function isTypingInField(target) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchRef = useRef(null);

  const onProducts = location.pathname === "/products";
  const urlQuery = onProducts ? (searchParams.get("q") ?? "") : "";

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  // Set by typing; cleared once the debounced search has been applied. It
  // keeps URL-driven changes (a removed chip, Back) from being re-submitted.
  const typedSinceLastSearch = useRef(false);

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const { pin, setPin } = useLocationPin();
  const { preference, setTheme } = useTheme();
  const { setRole, isStoreManager } = useRole();

  const cartCount = useSelector(selectCartCount);
  const wishlistCount = useSelector(selectWishlistIds).length;

  const activeCategory = (searchParams.get("category") ?? "").toLowerCase();

  function isActive(link) {
    if (location.pathname !== link.path) return false;
    if (link.path !== "/products") return true;
    return link.category === activeCategory;
  }

  // The URL is the source of truth: when q changes from outside the box
  // (chip removed, Back/Forward, a link), show it.
  useEffect(() => {
    if (!typedSinceLastSearch.current) setSearchInput(urlQuery);
  }, [urlQuery]);

  function searchUrl(term) {
    const params = new URLSearchParams(onProducts ? searchParams : undefined);
    if (term) params.set("q", term);
    else params.delete("q");
    params.delete("page");
    const query = params.toString();
    return `/products${query ? `?${query}` : ""}`;
  }

  // The values below are read when the typing pause ends, not when they
  // change, so they are kept in a ref instead of being effect dependencies.
  const latest = useRef(null);
  latest.current = { onProducts, urlQuery, searchUrl, navigate };

  // Module 2: results follow the box as the shopper types, but only after a
  // 300 ms pause — one service call per pause, not one per keystroke.
  useEffect(() => {
    if (!typedSinceLastSearch.current) return;
    typedSinceLastSearch.current = false;
    const {
      onProducts: onList,
      urlQuery: currentQuery,
      searchUrl: urlFor,
      navigate: go,
    } = latest.current;
    const term = debouncedSearch.trim();
    if (onList && term === currentQuery) return;
    if (!onList && term === "") return;
    go(urlFor(term));
  }, [debouncedSearch]);

  // "/" anywhere focuses the search box, unless the shopper is typing elsewhere.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingInField(event.target)) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearchSubmit(event) {
    event.preventDefault();
    typedSinceLastSearch.current = false;
    navigate(searchUrl(searchInput.trim()));
  }

  function handlePinSubmit(event) {
    event.preventDefault();
    const next = pinInput.trim();
    if (!/^\d{6}$/.test(next)) {
      setPinError("Enter a 6-digit PIN");
      return;
    }
    setPin(next);
    setPinError("");
    setPinInput("");
  }

  function handleCartClick(event) {
    // Anywhere but the cart page, the cart icon opens the mini-cart drawer.
    if (location.pathname !== "/cart") {
      event.preventDefault();
      dispatch(toggleCartDrawer());
    }
  }

  return (
    <header className={`${styles.siteHeader} no-print`}>
      <div className={styles.topBar}>
        <div className={`container ${styles.topRow}`}>
          <p className={styles.promo}>
            <TruckIcon size={16} weight="bold" aria-hidden="true" />
            Free shipping on orders over ₹{FREE_SHIPPING_ABOVE}
          </p>

          <div className={styles.topControls}>
            <form className={styles.pinForm} onSubmit={handlePinSubmit} noValidate>
              <label htmlFor="delivery-pin" className="visually-hidden">
                Delivery PIN code
              </label>
              <input
                id="delivery-pin"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder={pin || "Delivery PIN"}
                value={pinInput}
                onChange={(event) => {
                  setPinInput(event.target.value);
                  setPinError("");
                }}
                maxLength={6}
                aria-invalid={pinError ? true : undefined}
                aria-describedby="delivery-pin-status"
              />
              <button type="submit">Set</button>
              <span id="delivery-pin-status" className={styles.pinStatus} role="status">
                {pinError || (pin ? `Delivering to ${pin}` : "")}
              </span>
            </form>

            <label className={styles.roleToggle}>
              <input
                type="checkbox"
                checked={isStoreManager}
                onChange={(event) =>
                  setRole(event.target.checked ? "store-manager" : "shopper")
                }
              />
              Store manager
            </label>

            <select
              aria-label="Theme"
              className={styles.themeSelect}
              value={preference}
              onChange={(event) => setTheme(event.target.value)}
            >
              <option value="system">System theme</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.mainBar}>
        <div className={`container ${styles.mainRow}`}>
          <Link to="/" className={styles.brand} aria-label="MoveWell home">
            <span className={styles.brandMark} aria-hidden="true">
              <PersonSimpleRunIcon size={22} weight="bold" />
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>
                Move<span className={styles.brandAccent}>Well</span>
              </span>
              <span className={styles.brandSub}>Everything for active living</span>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`${styles.navLink} ${isActive(link) ? styles.navLinkActive : ""}`}
                aria-current={isActive(link) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <form className={styles.searchForm} onSubmit={handleSearchSubmit} role="search">
            <input
              ref={searchRef}
              type="search"
              placeholder="Search sports, shoes, health…  ( / )"
              value={searchInput}
              onChange={(event) => {
                typedSinceLastSearch.current = true;
                setSearchInput(event.target.value);
              }}
              aria-label="Search products"
              aria-keyshortcuts="/"
            />
            <button type="submit" aria-label="Search">
              <MagnifyingGlassIcon size={18} weight="bold" aria-hidden="true" />
            </button>
          </form>

          <div className={styles.actions}>
            {isStoreManager && (
              <Link
                to="/admin"
                className={styles.iconLink}
                aria-label="Admin"
                title="Admin"
              >
                <GearSixIcon size={22} aria-hidden="true" />
              </Link>
            )}

            <Link
              to="/account"
              className={styles.iconLink}
              aria-label="Your account"
              title="Account"
            >
              <UserCircleIcon size={22} aria-hidden="true" />
            </Link>

            <Link
              to="/wishlist"
              className={styles.iconLink}
              aria-label={`Wishlist, ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`}
              title="Wishlist"
            >
              <HeartIcon size={22} aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className={styles.badge} aria-hidden="true">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              className={styles.iconLink}
              onClick={handleCartClick}
              aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
              title="Cart"
            >
              <HandbagIcon size={22} aria-hidden="true" />
              {cartCount > 0 && (
                <span className={styles.badge} aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
