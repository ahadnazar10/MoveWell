import { Link } from "react-router-dom";
import { PersonSimpleRunIcon } from "@phosphor-icons/react";
import { DEPARTMENTS, GOALS } from "../utils/catalogue.js";
import styles from "./Footer.module.css";

const SHOP_LINKS = [
  ...DEPARTMENTS.map((d) => ({ label: d.label, to: `/products?category=${d.value}` })),
  { label: "All products", to: "/products" },
  { label: "MoveWell Kits", to: "/kits" },
];

const GOAL_LINKS = GOALS.map((g) => ({ label: g.label, to: `/goals?goal=${g.value}` }));

export function Footer() {
  return (
    <footer className={`${styles.footer} no-print`}>
      <div className={styles.topAccent} />
      <div className={`container ${styles.grid}`}>
        <div className={styles.brandBlock}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <PersonSimpleRunIcon size={20} weight="bold" />
            </span>
            MoveWell
          </Link>
          <p>
            Everything you need for an active lifestyle. Sports gear, footwear and
            health essentials in one place, delivered across India.
          </p>
          <p className={styles.note}>
            Health products are listed for general shopping only. Product information
            is not medical advice.
          </p>
        </div>
        <div className={styles.column}>
          <h2 className={styles.columnHeading}>Shop</h2>
          <ul className={styles.links}>
            {SHOP_LINKS.map((link) => (
              <li key={link.label}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.column}>
          <h2 className={styles.columnHeading}>Fitness goals</h2>
          <ul className={styles.links}>
            {GOAL_LINKS.map((link) => (
              <li key={link.label}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.column}>
          <h2 className={styles.columnHeading}>Account</h2>
          <ul className={styles.links}>
            <li>
              <Link to="/account">My Account</Link>
            </li>
            <li>
              <Link to="/account/orders">My Orders</Link>
            </li>
            <li>
              <Link to="/wishlist">Wishlist</Link>
            </li>
            <li>
              <Link to="/cart">Cart</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className={`container ${styles.bottom}`}>
        <span>© 2026 MoveWell. Demo project. No real payments are processed.</span>
        <span>Built with React, Redux Toolkit &amp; Vite</span>
      </div>
    </footer>
  );
}
