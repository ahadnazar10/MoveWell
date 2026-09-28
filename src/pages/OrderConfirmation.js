import { Fragment, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircleIcon, PrinterIcon, XCircleIcon } from "@phosphor-icons/react";
import {
  fetchOrder,
  cancelOrderThunk,
  selectOrderById,
} from "../features/orders/ordersSlice.js";
import { showToast } from "../features/ui/uiSlice.js";
import { StatusTracker } from "../components/StatusTracker.js";
import { formatRupee } from "../utils/rupee.js";
import { roundPaise } from "../utils/pricing.js";
import styles from "./OrderConfirmation.module.css";

const placedFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Orders saved by an earlier version used slightly different field names. */
function readAddress(order) {
  const a = order.delivery ?? order.shippingAddress ?? {};
  return {
    name: a.name ?? a.fullName ?? "",
    address: a.address ?? a.street ?? "",
    city: a.city ?? "",
    pin: a.pin ?? a.zipCode ?? "",
    phone: a.phone ?? "",
    email: a.email ?? "",
  };
}

export function OrderConfirmation() {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const order = useSelector(selectOrderById(orderId));
  const [status, setStatus] = useState(order ? "succeeded" : "loading");
  const [cancelling, setCancelling] = useState(false);

  // Always read the stored order, so a refresh (or a link opened hours
  // later) shows the same order and its current state.
  useEffect(() => {
    let active = true;
    setStatus((s) => (s === "succeeded" ? s : "loading"));
    dispatch(fetchOrder(orderId))
      .unwrap()
      .then(() => active && setStatus("succeeded"))
      .catch((err) => active && setStatus(err?.status === 404 ? "notFound" : "failed"));
    return () => {
      active = false;
    };
  }, [dispatch, orderId]);

  async function handleCancelOrder() {
    setCancelling(true);
    try {
      await dispatch(cancelOrderThunk(orderId)).unwrap();
      dispatch(showToast("Order cancelled", "info"));
    } catch (err) {
      dispatch(showToast(err?.message ?? "Couldn't cancel the order", "error"));
    } finally {
      setCancelling(false);
    }
  }

  // Module 6: opening the page without a real order goes home.
  if (status === "notFound") return <Navigate to="/" replace />;

  if (!order) {
    return (
      <div className="container section">
        {status === "failed" ? (
          <div className="empty-state" role="alert">
            <h1>We couldn&apos;t load your order</h1>
            <p className="muted">
              Your order is safe. The order service didn&apos;t respond.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => dispatch(fetchOrder(orderId))}
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="muted" role="status">
            Loading your order…
          </p>
        )}
      </div>
    );
  }

  const address = readAddress(order);
  const total = order.total ?? order.totalAmount;
  const savings =
    order.savings ??
    roundPaise(
      (order.items ?? []).reduce(
        (sum, i) =>
          sum + Math.max(0, (i.originalPrice ?? i.price) - i.price) * i.quantity,
        0
      )
    );

  return (
    <div className="container section">
      <div className={`${styles.successHeader} no-print`}>
        {order.status === "Cancelled" ? (
          <XCircleIcon
            size={48}
            weight="fill"
            className={styles.cancelIcon}
            aria-hidden="true"
          />
        ) : (
          <CheckCircleIcon
            size={48}
            weight="fill"
            className={styles.successIcon}
            aria-hidden="true"
          />
        )}
        <div>
          <h1>
            {order.status === "Cancelled"
              ? "Order cancelled"
              : "Thank you, your order is placed"}
          </h1>
          <p className="muted">
            Order <strong className={styles.orderIdBadge}>{order.orderId}</strong>, placed{" "}
            {placedFormat.format(new Date(order.placedAt))}.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            <PrinterIcon size={18} aria-hidden="true" /> Print invoice
          </button>
          <Link to="/products" className="btn btn-primary">
            Continue shopping
          </Link>
        </div>
      </div>

      <div className="no-print">
        <StatusTracker
          order={order}
          onCancelOrder={handleCancelOrder}
          isCancelling={cancelling}
        />
      </div>

      <article className={styles.invoiceCard} aria-labelledby="invoice-heading">
        <header className={styles.invoiceHeader}>
          <div>
            <h2 id="invoice-heading" className={styles.brandTitle}>
              MoveWell invoice
            </h2>
            <p className="muted">Order {order.orderId}</p>
          </div>
          <dl className={styles.invoiceMeta}>
            <div>
              <dt>Placed</dt>
              <dd>{placedFormat.format(new Date(order.placedAt))}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{order.paymentMethod === "card" ? "Card" : "Cash on Delivery"}</dd>
            </div>
          </dl>
        </header>

        <div className={styles.addressBox}>
          <h3>Deliver to</h3>
          <p>
            {address.name}
            <br />
            {address.address}, {address.city} {address.pin}
            <br />
            {address.phone}
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.itemsTable}>
            <caption className="visually-hidden">Order summary</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Qty</th>
                <th scope="col">Unit price</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item) => {
                const unitSaving = roundPaise(
                  (item.originalPrice ?? item.price) - item.price
                );
                return (
                  <Fragment key={item.productId}>
                    <tr>
                      <td>{item.title}</td>
                      <td>{item.quantity}</td>
                      <td>{formatRupee(item.price)}</td>
                      <td>{formatRupee(item.price * item.quantity)}</td>
                    </tr>
                    {unitSaving > 0 && (
                      <tr className={styles.savingsRow}>
                        <td colSpan={3}>
                          You saved on {item.title} ({Math.round(item.discountPercentage)}
                          % off {formatRupee(item.originalPrice)})
                        </td>
                        <td>−{formatRupee(unitSaving * item.quantity)}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <dl className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <dt>Subtotal</dt>
            <dd>{formatRupee(order.subtotal)}</dd>
          </div>
          <div className={styles.summaryRow}>
            <dt>GST (18%)</dt>
            <dd>{formatRupee(order.gst)}</dd>
          </div>
          <div className={styles.summaryRow}>
            <dt>Shipping</dt>
            <dd>{order.shipping === 0 ? "Free" : formatRupee(order.shipping)}</dd>
          </div>
          {savings > 0 && (
            <div className={styles.summaryRow}>
              <dt>You saved</dt>
              <dd>{formatRupee(savings)}</dd>
            </div>
          )}
          <div className={styles.totalRow}>
            <dt>Grand total</dt>
            <dd>{formatRupee(total)}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
