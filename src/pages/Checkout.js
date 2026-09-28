import { useEffect, useId, useReducer, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import {
  CheckIcon,
  PencilSimpleIcon,
  TrashIcon,
  WifiSlashIcon,
} from "@phosphor-icons/react";
import {
  selectCartItems,
  selectCartTotals,
  clearCart,
  setQuantity,
  removeItem,
} from "../features/cart/cartSlice.js";
import { fetchProduct } from "../features/products/productsSlice.js";
import {
  fetchAddresses,
  addAddress,
  editAddress,
  removeAddress,
  selectAddresses,
  selectAddressesStatus,
} from "../features/addresses/addressesSlice.js";
import { submitOrder } from "../features/orders/ordersSlice.js";
import { showToast } from "../features/ui/uiSlice.js";
import {
  STEPS,
  STEP_LABELS,
  checkoutReducer,
  createCheckoutState,
  stepErrors,
} from "../features/checkout/checkoutReducer.js";
import {
  ADDRESS_FIELDS,
  ADDRESS_LABELS,
  CARD_FIELDS,
  CARD_LABELS,
  validateAddress,
} from "../features/checkout/checkoutValidation.js";
import { getStock } from "../services/productsService.js";
import { useProductsByIds } from "../hooks/useProductsByIds.js";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";
import { useLocationPin } from "../context/LocationContext.js";
import { AddressFields } from "../components/AddressFields.js";
import { ConfirmDialog } from "../components/ConfirmDialog.js";
import { OrderSummary } from "../components/OrderSummary.js";
import { formatRupee } from "../utils/rupee.js";
import { originalPrice } from "../utils/pricing.js";
import { deliveryPromise } from "../utils/delivery.js";
import styles from "./Checkout.module.css";

const SECTION_ORDER = ["delivery", "billing", "card"];

function describeAddress(a) {
  return `${a.name}, ${a.address}, ${a.city} ${a.pin}`;
}

function Stepper({ current }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <ol className={styles.stepper} aria-label="Checkout progress">
      {STEPS.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
        return (
          <li
            key={step}
            className={`${styles.stepItem} ${styles[state]}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className={styles.stepNum} aria-hidden="true">
              {state === "done" ? <CheckIcon size={14} weight="bold" /> : index + 1}
            </span>
            {STEP_LABELS[step]}
            {state === "done" && <span className="visually-hidden"> (completed)</span>}
          </li>
        );
      })}
    </ol>
  );
}

Stepper.propTypes = { current: PropTypes.oneOf(STEPS).isRequired };

/** Inline editor for one saved address (Module 5: saved addresses can be edited). */
function SavedAddressEditor({ address, onDone }) {
  const dispatch = useDispatch();
  const idPrefix = useId();
  const [values, setValues] = useState(address);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function save() {
    const found = validateAddress(values);
    setErrors(found);
    const first = ADDRESS_FIELDS.find((f) => found[f]);
    if (first) {
      document.getElementById(`${idPrefix}-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await dispatch(editAddress({ id: address.id, data: values })).unwrap();
      dispatch(showToast("Address updated", "success"));
      onDone();
    } catch (err) {
      dispatch(showToast(err.message ?? "Couldn't update the address", "error"));
    } finally {
      setSaving(false);
    }
  }

  // Not a <form>: it sits inside the Address step's form, and forms can't be
  // nested. Enter in one of its fields saves this address instead of
  // submitting the step.
  function handleKeyDown(event) {
    if (event.key === "Enter" && event.target.tagName === "INPUT") {
      event.preventDefault();
      event.stopPropagation();
      save();
    }
  }

  return (
    <div
      className={styles.inlineEditor}
      role="group"
      aria-label={`Edit address for ${address.name}`}
      onKeyDown={handleKeyDown}
    >
      <AddressFields
        idPrefix={idPrefix}
        legend="Edit address"
        values={values}
        errors={errors}
        onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
      />
      <div className={styles.formActions}>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save address"}
        </button>
      </div>
    </div>
  );
}

SavedAddressEditor.propTypes = {
  address: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
  onDone: PropTypes.func.isRequired,
};

export function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { pin: headerPin } = useLocationPin();

  const cartItems = useSelector(selectCartItems);
  const totals = useSelector(selectCartTotals);
  const savedAddresses = useSelector(selectAddresses);
  const addressesStatus = useSelector(selectAddressesStatus);
  const {
    products,
    status: productsStatus,
    retry: retryProducts,
  } = useProductsByIds(cartItems.map((i) => i.productId));

  const [state, send] = useReducer(
    checkoutReducer,
    { pin: headerPin },
    createCheckoutState
  );
  const deliveryPrefix = useId();
  const billingPrefix = useId();
  const cardPrefix = useId();
  const stepHeadingRef = useRef(null);
  const placingRef = useRef(false);

  const [errorSummary, setErrorSummary] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState(null); // { message, conflicts? }
  // Level-up L7: the unit prices shown when Review opened, by product id.
  const [seenPrices, setSeenPrices] = useState(null);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  // Preselect the first saved address, once, when the list first arrives —
  // never again, or choosing "Use a new address" would snap back.
  const preselected = useRef(false);
  useEffect(() => {
    if (preselected.current || savedAddresses.length === 0) return;
    preselected.current = true;
    if (state.deliveryAddressId === "new" && !state.delivery.name) {
      send({ type: "selectDeliveryAddress", id: savedAddresses[0].id });
    }
  }, [savedAddresses, state.deliveryAddressId, state.delivery.name]);

  // Record the prices on screen when Review opens (and forget them when the
  // shopper leaves Review), so later price changes can be shown before paying.
  useEffect(() => {
    if (state.step !== "review") {
      setSeenPrices(null);
      return;
    }
    if (productsStatus === "ready" && seenPrices === null) {
      setSeenPrices(
        Object.fromEntries(
          cartItems.map((i) => [i.productId, products[i.productId]?.price])
        )
      );
    }
  }, [state.step, productsStatus, seenPrices, cartItems, products]);

  // Move focus to the new step's heading so keyboard and screen reader
  // users start at the top of it.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [state.step]);

  const prefixFor = {
    delivery: deliveryPrefix,
    billing: billingPrefix,
    card: cardPrefix,
  };

  function sectionErrors(section) {
    const out = {};
    for (const [key, message] of Object.entries(state.errors)) {
      const [s, field] = key.split(".");
      if (s === section) out[field] = message;
    }
    return out;
  }

  /** Validates the current step; on errors, focuses the first one and announces them. */
  function validateStep() {
    const errors = stepErrors(state);
    send({ type: "setErrors", errors });
    const keys = Object.keys(errors);
    if (keys.length === 0) {
      setErrorSummary("");
      return true;
    }
    const ordered = SECTION_ORDER.flatMap((section) =>
      (section === "card" ? CARD_FIELDS : ADDRESS_FIELDS).map(
        (field) => `${section}.${field}`
      )
    ).filter((key) => errors[key]);
    const [section, field] = ordered[0].split(".");
    document.getElementById(`${prefixFor[section]}-${field}`)?.focus();
    const labels = ordered.map((key) => {
      const [s, f] = key.split(".");
      return s === "card"
        ? CARD_LABELS[f]
        : `${s === "billing" ? "Billing " : ""}${ADDRESS_LABELS[f]}`;
    });
    setErrorSummary(
      `${ordered.length} ${ordered.length === 1 ? "field needs" : "fields need"} attention: ${labels.join(", ")}.`
    );
    return false;
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();
    // The chosen saved address may have been deleted in another tab.
    if (
      state.deliveryAddressId !== "new" &&
      !savedAddresses.some((a) => a.id === state.deliveryAddressId)
    ) {
      const message =
        "The saved address you chose no longer exists. Enter a delivery address.";
      send({ type: "selectDeliveryAddress", id: "new" });
      setErrorSummary(message);
      dispatch(showToast(message, "error"));
      return;
    }
    if (!validateStep()) return;
    if (state.deliveryAddressId === "new" && state.saveNewAddress) {
      setSavingAddress(true);
      try {
        const saved = await dispatch(addAddress(state.delivery)).unwrap();
        send({ type: "addressSaved", id: saved.id });
      } catch {
        dispatch(
          showToast(
            "Your address couldn't be saved for next time, but you can still continue.",
            "error"
          )
        );
      } finally {
        setSavingAddress(false);
      }
    }
    send({ type: "goToStep", step: "payment" });
  }

  function handlePaymentSubmit(event) {
    event.preventDefault();
    if (validateStep()) send({ type: "goToStep", step: "review" });
  }

  const deliveryAddress =
    state.deliveryAddressId === "new"
      ? state.delivery
      : (savedAddresses.find((a) => a.id === state.deliveryAddressId) ?? state.delivery);
  const billingAddress = state.billingSameAsDelivery ? deliveryAddress : state.billing;

  /**
   * Place order. Guarded by a ref (not just the disabled button), so a
   * double-click or Enter held down can never start two attempts; the
   * clientOrderId makes retries after a failure idempotent on the service.
   */
  async function handlePlaceOrder(event) {
    event.preventDefault();
    if (placingRef.current || !isOnline) return;
    placingRef.current = true;
    setPlacing(true);
    setPlaceError(null);

    try {
      // Module 5: re-check the latest stock of every item, one getStock per
      // item, in parallel. Stop and list anything that is now short.
      let stocks;
      try {
        stocks = await Promise.all(cartItems.map((item) => getStock(item.productId)));
      } catch {
        setPlaceError({
          message: "We couldn't confirm stock just now. Please try again.",
        });
        return;
      }
      const short = cartItems
        .map((item, i) => ({ item, available: stocks[i].stock }))
        .filter(({ item, available }) => available < item.quantity)
        .map(({ item, available }) => ({
          productId: item.productId,
          title: products[item.productId]?.title ?? "An item",
          reason: "stock",
          requested: item.quantity,
          available,
        }));
      if (short.length > 0) {
        setPlaceError({
          message: "Some items no longer have enough stock.",
          conflicts: short,
        });
        return;
      }

      // Charge exactly the prices the shopper can see on this page.
      const items = cartItems.map((item) => {
        const product = products[item.productId];
        return {
          productId: product.id,
          title: product.title,
          thumbnail: product.thumbnail,
          price: product.price,
          originalPrice: originalPrice(product),
          discountPercentage: product.discountPercentage ?? 0,
          quantity: item.quantity,
        };
      });

      const result = await dispatch(
        submitOrder({
          clientOrderId: state.clientOrderId,
          items,
          delivery: deliveryAddress,
          billing: billingAddress,
          paymentMethod: state.paymentMethod, // card details are never included or stored
          ...totals,
        })
      ).unwrap();

      send({ type: "clearCard" });
      dispatch(clearCart());
      dispatch(showToast("Order placed", "success"));
      navigate(`/order-confirmation/${result.orderId}`, { replace: true });
    } catch (err) {
      const conflicts = err?.details?.conflicts;
      if (err?.status === 409 && conflicts) {
        // Level-up L7: reload changed products so the page shows the new
        // price or stock; nothing the shopper typed is lost.
        for (const c of conflicts)
          dispatch(fetchProduct({ id: c.productId, force: true }));
        setPlaceError({ message: err.message, conflicts });
      } else {
        setPlaceError({
          message: `${err?.message ?? "The order failed"}. You can safely try again.`,
        });
      }
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  }

  function fixConflict(conflict) {
    if (conflict.reason === "stock" && conflict.available > 0) {
      dispatch(
        setQuantity({ productId: conflict.productId, quantity: conflict.available })
      );
    } else if (conflict.reason !== "price") {
      dispatch(removeItem(conflict.productId));
    }
    setPlaceError((prev) =>
      prev?.conflicts
        ? {
            ...prev,
            conflicts: prev.conflicts.filter((c) => c.productId !== conflict.productId),
          }
        : prev
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h1>Your cart is empty</h1>
          <p className="muted">Add something to your cart before checking out.</p>
          <Link to="/products" className="btn btn-primary">
            Browse the catalogue
          </Link>
        </div>
      </div>
    );
  }

  const stepTitle = {
    address: "Step 1 of 3: Address",
    payment: "Step 2 of 3: Payment",
    review: "Step 3 of 3: Review",
  }[state.step];
  const productsReady = productsStatus === "ready";

  // Prices that changed since Review opened (e.g. a store manager edited one
  // in another tab and cross-tab sync reloaded it). Place order waits until
  // the shopper has seen and accepted them.
  const changedPrices =
    state.step === "review" && seenPrices
      ? cartItems
          .filter((i) => {
            const p = products[i.productId];
            return (
              p &&
              seenPrices[i.productId] !== undefined &&
              p.price !== seenPrices[i.productId]
            );
          })
          .map((i) => ({
            productId: i.productId,
            title: products[i.productId].title,
            seenPrice: seenPrices[i.productId],
            currentPrice: products[i.productId].price,
          }))
      : [];

  function acceptCurrentPrices() {
    setSeenPrices(
      Object.fromEntries(
        cartItems.map((i) => [i.productId, products[i.productId]?.price])
      )
    );
  }

  return (
    <div className="container section">
      <h1 className={styles.pageTitle}>Checkout</h1>
      <Stepper current={state.step} />

      <p className="visually-hidden" role="alert">
        {errorSummary}
      </p>

      <div className={styles.checkoutLayout}>
        <div className={styles.mainForm}>
          <h2 ref={stepHeadingRef} tabIndex={-1} className={styles.stepTitle}>
            {stepTitle}
          </h2>

          {state.step === "address" && (
            <form onSubmit={handleAddressSubmit} noValidate className={styles.card}>
              {addressesStatus === "loading" && savedAddresses.length === 0 && (
                <p className="muted" role="status">
                  Loading saved addresses…
                </p>
              )}
              {addressesStatus === "failed" && (
                <p className={styles.inlineError} role="alert">
                  Saved addresses couldn&apos;t be loaded.{" "}
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => dispatch(fetchAddresses())}
                  >
                    Retry
                  </button>
                </p>
              )}

              {savedAddresses.length > 0 && (
                <fieldset className={styles.savedList}>
                  <legend className={styles.legend}>Deliver to</legend>
                  {savedAddresses.map((addr) =>
                    editingAddressId === addr.id ? (
                      <SavedAddressEditor
                        key={addr.id}
                        address={addr}
                        onDone={() => setEditingAddressId(null)}
                      />
                    ) : (
                      <div key={addr.id} className={styles.savedOption}>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="deliveryAddress"
                            checked={state.deliveryAddressId === addr.id}
                            onChange={() =>
                              send({ type: "selectDeliveryAddress", id: addr.id })
                            }
                          />
                          <span>
                            <strong>{addr.name}</strong>
                            <span className={styles.addrLine}>
                              {addr.address}, {addr.city} {addr.pin}
                            </span>
                            <span className={styles.addrLine}>
                              {addr.phone} · {addr.email}
                            </span>
                          </span>
                        </label>
                        <div className={styles.savedActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => setEditingAddressId(addr.id)}
                            aria-label={`Edit address for ${addr.name}`}
                          >
                            <PencilSimpleIcon size={18} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => setAddressToDelete(addr)}
                            aria-label={`Delete address for ${addr.name}`}
                          >
                            <TrashIcon size={18} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                  <label className={`${styles.radioLabel} ${styles.savedOption} ${styles.newAddressOption}`}>
                    <input
                      type="radio"
                      name="deliveryAddress"
                      checked={state.deliveryAddressId === "new"}
                      onChange={() => send({ type: "selectDeliveryAddress", id: "new" })}
                    />
                    <strong>Use a new address</strong>
                  </label>
                </fieldset>
              )}

              <div
                className={`${styles.addressForms} ${state.billingSameAsDelivery ? "" : styles.twoUp}`}
              >
                {state.deliveryAddressId === "new" && (
                  <div>
                    <AddressFields
                      idPrefix={deliveryPrefix}
                      legend="Delivery address"
                      autoCompleteSection="delivery"
                      values={state.delivery}
                      errors={sectionErrors("delivery")}
                      onChange={(field, value) =>
                        send({ type: "editField", section: "delivery", field, value })
                      }
                      onBlur={(field) =>
                        send({ type: "blurField", section: "delivery", field })
                      }
                    />
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={state.saveNewAddress}
                        onChange={(e) =>
                          send({ type: "setSaveNewAddress", value: e.target.checked })
                        }
                      />
                      Save this address for next time
                    </label>
                  </div>
                )}

                {!state.billingSameAsDelivery && (
                  <AddressFields
                    idPrefix={billingPrefix}
                    legend="Billing address"
                    autoCompleteSection="billing"
                    values={state.billing}
                    errors={sectionErrors("billing")}
                    onChange={(field, value) =>
                      send({ type: "editField", section: "billing", field, value })
                    }
                    onBlur={(field) =>
                      send({ type: "blurField", section: "billing", field })
                    }
                  />
                )}
              </div>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={state.billingSameAsDelivery}
                  onChange={(e) =>
                    send({ type: "setBillingSameAsDelivery", value: e.target.checked })
                  }
                />
                Billing address is the same as delivery
              </label>

              <div className={styles.formActions}>
                <Link to="/cart" className="btn btn-secondary">
                  Back to cart
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingAddress}
                >
                  {savingAddress ? "Saving…" : "Continue to payment"}
                </button>
              </div>
            </form>
          )}

          {state.step === "payment" && (
            <form onSubmit={handlePaymentSubmit} noValidate className={styles.card}>
              <fieldset className={styles.paymentOptions}>
                <legend className={styles.legend}>Payment method</legend>
                <label className={styles.paymentOption}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={state.paymentMethod === "cod"}
                    onChange={() => send({ type: "setPaymentMethod", method: "cod" })}
                  />
                  <span>
                    <strong>Cash on Delivery</strong>
                    <span className={styles.addrLine}>Pay when your order arrives.</span>
                  </span>
                </label>
                <label className={styles.paymentOption}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={state.paymentMethod === "card"}
                    onChange={() => send({ type: "setPaymentMethod", method: "card" })}
                  />
                  <span>
                    <strong>Card (demo)</strong>
                    <span className={styles.addrLine}>
                      A mock card. Details are never saved anywhere.
                    </span>
                  </span>
                </label>
              </fieldset>

              {state.paymentMethod === "card" && (
                <div className={styles.cardGrid}>
                  {CARD_FIELDS.map((field) => {
                    const id = `${cardPrefix}-${field}`;
                    const error = state.errors[`card.${field}`];
                    return (
                      <div
                        key={field}
                        className={`${styles.field} ${field === "number" ? styles.wide : ""}`}
                      >
                        <label htmlFor={id}>{CARD_LABELS[field]}</label>
                        <input
                          id={id}
                          type={field === "cvv" ? "password" : "text"}
                          inputMode="numeric"
                          autoComplete={
                            { number: "cc-number", expiry: "cc-exp", cvv: "cc-csc" }[
                              field
                            ]
                          }
                          maxLength={{ number: 19, expiry: 5, cvv: 4 }[field]}
                          placeholder={field === "expiry" ? "MM/YY" : undefined}
                          value={state.card[field]}
                          onChange={(e) =>
                            send({
                              type: "editField",
                              section: "card",
                              field,
                              value: e.target.value,
                            })
                          }
                          onBlur={() =>
                            send({
                              type: "blurField",
                              section: "card",
                              field,
                              now: new Date(),
                            })
                          }
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? `${id}-error` : undefined}
                          aria-required="true"
                        />
                        {error && (
                          <p id={`${id}-error`} className={styles.fieldError}>
                            {error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => send({ type: "goToStep", step: "address" })}
                >
                  Back
                </button>
                <button type="submit" className="btn btn-primary">
                  Review order
                </button>
              </div>
            </form>
          )}

          {state.step === "review" && (
            <form onSubmit={handlePlaceOrder} className={styles.card}>
              {!isOnline && (
                <p className={styles.offline} role="status">
                  <WifiSlashIcon size={18} aria-hidden="true" /> You&apos;re offline.
                  Place order is paused until your connection returns.
                </p>
              )}

              {changedPrices.length > 0 && (
                <div className={styles.errorBanner} role="alert">
                  <p className={styles.errorTitle}>
                    Prices changed while you were checking out.
                  </p>
                  <ul className={styles.conflicts}>
                    {changedPrices.map((c) => (
                      <li key={c.productId}>
                        <span>
                          <strong>{c.title}</strong> is now {formatRupee(c.currentPrice)}{" "}
                          (was {formatRupee(c.seenPrice)}).
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p>The order summary shows the new total.</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={acceptCurrentPrices}
                  >
                    Use the new prices
                  </button>
                </div>
              )}

              {placeError && (
                <div className={styles.errorBanner} role="alert">
                  <p className={styles.errorTitle}>{placeError.message}</p>
                  {placeError.conflicts?.length > 0 && (
                    <ul className={styles.conflicts}>
                      {placeError.conflicts.map((c) => (
                        <li key={c.productId}>
                          <span>
                            <strong>{c.title}</strong>{" "}
                            {c.reason === "price"
                              ? `is now ${formatRupee(c.currentPrice)} (was ${formatRupee(c.seenPrice)}). The totals below are updated.`
                              : c.reason === "removed"
                                ? "is no longer sold."
                                : `: you asked for ${c.requested}, ${c.available} left.`}
                          </span>
                          {c.reason !== "price" && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => fixConflict(c)}
                            >
                              {c.available > 0 ? `Change to ${c.available}` : "Remove"}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className={styles.reviewBlocks}>
                <section className={styles.reviewBlock} aria-labelledby="review-delivery">
                  <div className={styles.blockHeader}>
                    <h3 id="review-delivery">Delivery</h3>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => send({ type: "goToStep", step: "address" })}
                    >
                      Edit<span className="visually-hidden"> delivery address</span>
                    </button>
                  </div>
                  <p>{describeAddress(deliveryAddress)}</p>
                  <p className="muted">
                    {deliveryAddress.phone} · {deliveryAddress.email}
                  </p>
                  {/^\d{6}$/.test(deliveryAddress.pin) && (
                    <p className={styles.promise}>
                      {deliveryPromise(deliveryAddress.pin)}
                    </p>
                  )}
                </section>

                <section className={styles.reviewBlock} aria-labelledby="review-billing">
                  <div className={styles.blockHeader}>
                    <h3 id="review-billing">Billing</h3>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => send({ type: "goToStep", step: "address" })}
                    >
                      Edit<span className="visually-hidden"> billing address</span>
                    </button>
                  </div>
                  <p>
                    {state.billingSameAsDelivery
                      ? "Same as delivery"
                      : describeAddress(billingAddress)}
                  </p>
                </section>

                <section className={styles.reviewBlock} aria-labelledby="review-payment">
                  <div className={styles.blockHeader}>
                    <h3 id="review-payment">Payment</h3>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => send({ type: "goToStep", step: "payment" })}
                    >
                      Edit<span className="visually-hidden"> payment method</span>
                    </button>
                  </div>
                  <p>
                    {state.paymentMethod === "card"
                      ? `Card ending ${state.card.number.replace(/\D/g, "").slice(-4)}`
                      : "Cash on Delivery"}
                  </p>
                </section>
              </div>

              <div className={styles.reviewItems}>
                <h3>Items</h3>
                {productsStatus === "failed" ? (
                  <p role="alert">
                    Some items couldn&apos;t be loaded.{" "}
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={retryProducts}
                    >
                      Retry
                    </button>
                  </p>
                ) : (
                  <ul>
                    {cartItems.map((item) => {
                      const p = products[item.productId];
                      return (
                        <li key={item.productId} className={styles.reviewItemRow}>
                          <span>
                            {p ? p.title : "Loading…"} × {item.quantity}
                          </span>
                          <span>{p ? formatRupee(p.price * item.quantity) : ""}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => send({ type: "goToStep", step: "payment" })}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${styles.placeBtn}`}
                  disabled={
                    placing || !isOnline || !productsReady || changedPrices.length > 0
                  }
                >
                  {placing
                    ? "Placing order…"
                    : `Place order · ${formatRupee(totals.total)}`}
                </button>
              </div>
            </form>
          )}
        </div>

        <OrderSummary totals={totals} heading="Order summary">
          <ul className={styles.summaryItems}>
            {cartItems.map((item) => {
              const p = products[item.productId];
              return (
                <li key={item.productId}>
                  <span>
                    {p?.title ?? "Loading…"}{" "}
                    <span className="muted">× {item.quantity}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </OrderSummary>
      </div>

      <ConfirmDialog
        isOpen={Boolean(addressToDelete)}
        title="Delete address?"
        message={
          addressToDelete
            ? `Delete the address for ${addressToDelete.name}? This can't be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={async () => {
          const target = addressToDelete;
          setAddressToDelete(null);
          try {
            await dispatch(removeAddress(target.id)).unwrap();
            if (state.deliveryAddressId === target.id)
              send({ type: "selectDeliveryAddress", id: "new" });
            dispatch(showToast("Address deleted", "info"));
          } catch (err) {
            dispatch(showToast(err.message ?? "Couldn't delete the address", "error"));
          }
        }}
        onCancel={() => setAddressToDelete(null)}
      />
    </div>
  );
}
