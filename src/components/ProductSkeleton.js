import PropTypes from "prop-types";
import styles from "./ProductSkeleton.module.css";

/** Placeholder cards shaped like ProductCard, shown while the catalogue loads. */
export function ProductSkeleton({ count = 6 }) {
  return (
    <div className={styles.grid} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div className={styles.card} key={i} aria-hidden="true">
          <div className={styles.image} />
          <div className={styles.content}>
            <div className={styles.meta} />
            <div className={styles.title} />
            <div className={styles.titleShort} />
            <div className={styles.price} />
            <div className={styles.btn} />
          </div>
        </div>
      ))}
    </div>
  );
}

ProductSkeleton.propTypes = {
  count: PropTypes.number,
};
