import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  CheckIcon,
  PackageIcon,
  ReceiptXIcon,
  TruckIcon,
  ClipboardTextIcon,
  HouseLineIcon,
} from "@phosphor-icons/react";
import { ORDER_STEPS, deriveOrderStatus } from "../utils/orderStatus.js";
import styles from "./StatusTracker.module.css";

const ICONS = [ClipboardTextIcon, PackageIcon, TruckIcon, HouseLineIcon];

/**
 * Placed → Packed → Shipped → Delivered, one step every 20 seconds after
 * placedAt, plus a Cancel button with a live countdown for the first 60
 * seconds. A 1-second tick re-derives everything from the clock, and stops
 * once there is nothing left to count down.
 */
export function StatusTracker({ order, onCancelOrder, isCancelling = false }) {
  const [now, setNow] = useState(() => Date.now());
  const { status, stepIndex, cancelSecondsLeft } = deriveOrderStatus(order, now);
  const finished =
    status === "Cancelled" || (status === "Delivered" && cancelSecondsLeft === 0);

  useEffect(() => {
    if (finished) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [finished]);

  if (status === "Cancelled") {
    return (
      <div className={styles.cancelledBanner} role="status">
        <ReceiptXIcon size={28} aria-hidden="true" />
        <div>
          <h2>Order cancelled</h2>
          <p>
            This order was cancelled within the 60-second window. Nothing will be shipped.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className={styles.trackerBox} aria-labelledby="tracker-heading">
      <div className={styles.topRow}>
        <h2 id="tracker-heading">
          Status: <span className={styles.currentStatus}>{status}</span>
        </h2>
        {cancelSecondsLeft > 0 && onCancelOrder && (
          <div className={styles.cancelBox}>
            <span className={styles.timerBadge} aria-live="off">
              Cancel available for {cancelSecondsLeft}s
            </span>
            <button
              type="button"
              className={`btn btn-secondary ${styles.cancelBtn}`}
              onClick={onCancelOrder}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling…" : "Cancel order"}
            </button>
          </div>
        )}
      </div>

      <ol className={styles.stepper}>
        {ORDER_STEPS.map((label, index) => {
          const Icon = index < stepIndex ? CheckIcon : ICONS[index];
          const state =
            index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
          return (
            <li
              key={label}
              className={`${styles.step} ${styles[state]}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className={styles.stepIcon}>
                <Icon size={20} weight="bold" aria-hidden="true" />
              </span>
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

StatusTracker.propTypes = {
  order: PropTypes.shape({
    placedAt: PropTypes.string.isRequired,
    status: PropTypes.string,
  }).isRequired,
  onCancelOrder: PropTypes.func,
  isCancelling: PropTypes.bool,
};
