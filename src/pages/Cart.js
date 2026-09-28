import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { TrashIcon } from "@phosphor-icons/react";
import {
  selectCartItems,
  selectCartTotals,
  removeItem,
  setQuantity,
  changeQuantity,
  clearCart,
} from "../features/cart/cartSlice.js";
import { showToast } from "../features/ui/uiSlice.js";
import { useProductsByIds } from "../hooks/useProductsByIds.js";
import { useProductImage, showPlaceholderOnError } from "../hooks/useProductImage.js";
import { useLocationPin } from "../context/LocationContext.js";
import { QuantityInput } from "../components/QuantityInput.js";
import { ConfirmDialog } from "../components/ConfirmDialog.js";
import { OrderSummary } from "../components/OrderSummary.js";
import { formatRupee } from "../utils/rupee.js";
import { hasDiscount, originalPrice, unitSavings } from "../utils/pricing.js";
import { deliveryPromise } from "../utils/delivery.js";
import { departmentLabel } from "../utils/catalogue.js";
import styles from "./Cart.module.css";

function CartRow({ item, product, onRemove }) {
  const dispatch = useDispatch();
  const image = useProductImage(product.thumbnail);
  const discounted = hasDiscount(product);

  return (
    <li className={styles.row}>
      <img src={image} alt="" className={styles.thumb} onError={showPlaceholderOnError} />

      <div className={styles.productMeta}>
        <Link to={`/products/${product.id}`} className={styles.title}>
          {product.title}
        </Link>
        <span className={styles.category}>
          <span className="dept-chip" data-dept={product.category}>
            {departmentLabel(product.category)}
          </span>{" "}
          {product.subcategory}
        </span>
        <span className={styles.unitPrice}>
          {formatRupee(product.price)}
          {discounted && (
            <s className={styles.oldPrice}>
              <span className="visually-hidden">Original price </span>
              {formatRupee(originalPrice(product))}
            </s>
          )}
        </span>
        {item.quantity > product.stock && (
          <span className={styles.stockWarning} role="status">
            {product.stock === 0
              ? "Now out of stock. Remove it to check out."
              : `Only ${product.stock} left. Lower the quantity to check out.`}
          </span>
        )}
        {discounted && (
          <span className={styles.savingsBadge}>
            You save {formatRupee(unitSavings(product) * item.quantity)}
          </span>
        )}
      </div>

      <div className={styles.qtyCol}>
        <QuantityInput
          value={item.quantity}
          max={product.stock}
          label={`Quantity of ${product.title}`}
          onChange={(quantity) =>
            dispatch(setQuantity({ productId: product.id, quantity }))
          }
          onStep={(delta) =>
            dispatch(changeQuantity({ productId: product.id, delta, max: product.stock }))
          }
          onExceed={() =>
            dispatch(
              showToast(`Only ${product.stock} of ${product.title} in stock`, "error")
            )
          }
        />
      </div>

      <span className={styles.lineTotal}>
        {formatRupee(product.price * item.quantity)}
      </span>

      <button
        type="button"
        className={styles.removeBtn}
        onClick={() => onRemove(product)}
        aria-label={`Remove ${product.title} from cart`}
      >
        <TrashIcon size={20} aria-hidden="true" />
      </button>
    </li>
  );
}

CartRow.propTypes = {
  item: PropTypes.shape({ quantity: PropTypes.number.isRequired }).isRequired,
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    subcategory: PropTypes.string,
    price: PropTypes.number.isRequired,
    stock: PropTypes.number.isRequired,
    thumbnail: PropTypes.string,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
};

export function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartItems = useSelector(selectCartItems);
  const totals = useSelector(selectCartTotals);
  const { pin, isValid } = useLocationPin();
  const { products, missingIds, status, retry } = useProductsByIds(
    cartItems.map((i) => i.productId)
  );

  const [itemToRemove, setItemToRemove] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  function handleConfirmRemoveItem() {
    dispatch(removeItem(itemToRemove.id));
    dispatch(showToast(`Removed ${itemToRemove.title}`, "info"));
    setItemToRemove(null);
  }

  function handleConfirmClearCart() {
    dispatch(clearCart());
    dispatch(showToast("Cart cleared", "info"));
    setShowClearConfirm(false);
  }

  if (cartItems.length === 0) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h1>Your cart is empty</h1>
          <p className="muted">Nothing here yet. Find something for your next session.</p>
          <Link to="/products" className="btn btn-primary">
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  const overStock = cartItems.some(
    (i) => products[i.productId] && i.quantity > products[i.productId].stock
  );
  const ready = status === "ready" && missingIds.length === 0 && !overStock;

  return (
    <div className="container section">
      <div className={styles.headerRow}>
        <h1>
          Your cart{" "}
          <span className={styles.count}>
            ({totals.itemCount || cartItems.length} items)
          </span>
        </h1>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowClearConfirm(true)}
        >
          Clear cart
        </button>
      </div>

      {missingIds.length > 0 && (
        <div className={styles.notice} role="alert">
          <p>
            {missingIds.length === 1 ? "An item" : `${missingIds.length} items`} in your
            cart {missingIds.length === 1 ? "is" : "are"} no longer sold.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => missingIds.forEach((id) => dispatch(removeItem(id)))}
          >
            Remove {missingIds.length === 1 ? "it" : "them"}
          </button>
        </div>
      )}

      {status === "failed" && (
        <div className={styles.notice} role="alert">
          <p>Some cart items couldn&apos;t be loaded.</p>
          <button type="button" className="btn btn-primary" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      <div className={styles.cartGrid}>
        <ul className={styles.list} aria-label="Cart items">
          {cartItems.map((item) =>
            products[item.productId] ? (
              <CartRow
                key={item.productId}
                item={item}
                product={products[item.productId]}
                onRemove={setItemToRemove}
              />
            ) : missingIds.includes(item.productId) ? null : (
              <li
                key={item.productId}
                className={styles.skeletonRow}
                aria-hidden="true"
              />
            )
          )}
        </ul>

        <OrderSummary totals={totals} heading="Order summary">
          <p className={styles.delivery}>
            {isValid
              ? deliveryPromise(pin)
              : "Set your delivery PIN in the top bar to see a delivery date."}
          </p>
          <button
            type="button"
            className={`btn btn-primary ${styles.checkoutBtn}`}
            onClick={() => navigate("/checkout")}
            disabled={!ready}
          >
            Proceed to checkout
          </button>
        </OrderSummary>
      </div>

      <ConfirmDialog
        isOpen={Boolean(itemToRemove)}
        title="Remove item?"
        message={
          itemToRemove ? (
            <>
              Remove <strong>{itemToRemove.title}</strong> from your cart?
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Remove"
        cancelLabel="Keep it"
        onConfirm={handleConfirmRemoveItem}
        onCancel={() => setItemToRemove(null)}
      />

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear your cart?"
        message="This removes every item from your cart."
        confirmLabel="Clear cart"
        cancelLabel="Cancel"
        onConfirm={handleConfirmClearCart}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
