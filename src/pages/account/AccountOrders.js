import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchOrders,
  selectOrders,
  selectOrdersStatus,
  selectOrdersError,
} from "../../features/orders/ordersSlice.js";
import { deriveOrderStatus } from "../../utils/orderStatus.js";
import { formatRupee } from "../../utils/rupee.js";
import styles from "./AccountOrders.module.css";

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Past orders, newest first (sorted by the service); each opens its confirmation view. */
export function AccountOrders() {
  const dispatch = useDispatch();
  const orders = useSelector(selectOrders);
  const status = useSelector(selectOrdersStatus);
  const error = useSelector(selectOrdersError);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading">Orders</h2>

      {status === "loading" && orders.length === 0 ? (
        <p className="muted" role="status">
          Loading your orders…
        </p>
      ) : status === "failed" ? (
        <div className="empty-state" role="alert">
          <p>{error ?? "Your orders couldn't be loaded."}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => dispatch(fetchOrders())}
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p className="muted">You haven&apos;t placed any orders yet.</p>
          <Link to="/products" className="btn btn-primary">
            Start shopping
          </Link>
        </div>
      ) : (
        <ol className={styles.ordersList}>
          {orders.map((order) => {
            const { status: orderStatus } = deriveOrderStatus(order);
            const itemCount = (order.items ?? []).reduce((sum, i) => sum + i.quantity, 0);
            return (
              <li key={order.orderId} className={styles.orderCard}>
                <div className={styles.orderMain}>
                  <Link
                    to={`/order-confirmation/${order.orderId}`}
                    className={styles.orderId}
                  >
                    {order.orderId}
                  </Link>
                  <span className={styles.orderDate}>
                    {dateFormat.format(new Date(order.placedAt))}
                  </span>
                  <span className={styles.orderItems}>
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </div>
                <span
                  className={`${styles.statusBadge} ${orderStatus === "Cancelled" ? styles.cancelled : ""}`}
                >
                  {orderStatus}
                </span>
                <span className={styles.totalAmount}>
                  {formatRupee(order.total ?? order.totalAmount)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
