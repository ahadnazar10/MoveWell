import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { KitCard } from "../components/KitCard.js";
import {
  loadKits,
  selectKits,
  selectCatalogueVersion,
} from "../features/products/productsSlice.js";
import { selectFitnessGoal } from "../features/profile/profileSlice.js";
import styles from "./Kits.module.css";

/**
 * MoveWell Kits: bundles that mix sports gear, footwear and health products,
 * something none of the three original stores could offer alone. The kit
 * matching the shopper's fitness goal is listed first.
 */
export function Kits() {
  const dispatch = useDispatch();
  const { items, status } = useSelector(selectKits);
  const goal = useSelector(selectFitnessGoal);
  const catalogueVersion = useSelector(selectCatalogueVersion);

  useEffect(() => {
    dispatch(loadKits());
  }, [dispatch, catalogueVersion]);

  const ordered = [...items].sort(
    (a, b) => Number(b.goal === goal) - Number(a.goal === goal)
  );

  return (
    <div className="container section">
      <header className={styles.header}>
        <p className={styles.eyebrow}>MoveWell Kits</p>
        <h1 className={styles.title}>Cross-category starter kits</h1>
        <p className={styles.lead}>
          Each kit combines sports gear, footwear and health essentials for one goal.
          Items are picked from what&apos;s in stock right now, and the kit is added to
          your cart as individual items, so you can still change quantities or remove
          anything.
        </p>
      </header>

      {status === "failed" && items.length === 0 ? (
        <div className="empty-state" role="alert">
          <h2>We couldn&apos;t load the kits</h2>
          <p className="muted">The catalogue service didn&apos;t respond. Please try again.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => dispatch(loadKits())}
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="muted" role="status">
          Loading kits…
        </p>
      ) : (
        <div className={styles.grid}>
          {ordered.map((kit) => (
            <KitCard key={kit.id} kit={kit} headingLevel={2} />
          ))}
        </div>
      )}
    </div>
  );
}
