import PropTypes from "prop-types";
import { formatRupee } from "../utils/rupee.js";
import { GST_RATE } from "../utils/pricing.js";
import styles from "./OrderSummary.module.css";

/** Subtotal, GST, shipping, savings and total. Used by the cart and checkout. */
export function OrderSummary({ totals, heading, children }) {
  return (
    <aside className={styles.card} aria-labelledby="order-summary-heading">
      <h2 id="order-summary-heading" className={styles.heading}>
        {heading}
      </h2>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Subtotal</dt>
          <dd>{formatRupee(totals.subtotal)}</dd>
        </div>
        <div className={styles.row}>
          <dt>GST ({Math.round(GST_RATE * 100)}%)</dt>
          <dd>{formatRupee(totals.gst)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Shipping</dt>
          <dd>{totals.shipping === 0 ? "Free" : formatRupee(totals.shipping)}</dd>
        </div>
        <div className={`${styles.row} ${styles.total}`}>
          <dt>Grand total</dt>
          <dd>{formatRupee(totals.total)}</dd>
        </div>
      </dl>
      {totals.savings > 0 && (
        <p className={styles.savings}>You saved {formatRupee(totals.savings)}</p>
      )}
      {children}
    </aside>
  );
}

OrderSummary.propTypes = {
  totals: PropTypes.shape({
    subtotal: PropTypes.number.isRequired,
    gst: PropTypes.number.isRequired,
    shipping: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    savings: PropTypes.number.isRequired,
  }).isRequired,
  heading: PropTypes.string.isRequired,
  children: PropTypes.node,
};
