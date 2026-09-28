import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import styles from "./AccountLayout.module.css";

const LINKS = [
  { to: "/account/orders", label: "Orders" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/preferences", label: "Preferences" },
];

/**
 * One layout for the Account area: a side menu (the active item comes from
 * NavLink, which also sets aria-current="page") and the nested page, each
 * with its own URL, in the Outlet.
 */
export function AccountLayout() {
  return (
    <div className="container section">
      <h1 className={styles.title}>Your account</h1>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Account">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.content}>
          <Suspense
            fallback={
              <p className="muted" role="status">
                Loading…
              </p>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
