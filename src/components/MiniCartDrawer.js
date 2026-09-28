import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { XIcon, TrashIcon } from "@phosphor-icons/react";
import {
  selectCartItems,
  selectCartCount,
  selectCartTotals,
  removeItem,
  setQuantity,
  changeQuantity,
} from "../features/cart/cartSlice.js";
import {
  selectIsCartDrawerOpen,
  closeCartDrawer,
  showToast,
} from "../features/ui/uiSlice.js";
import { useProductsByIds } from "../hooks/useProductsByIds.js";
import { useProductImage, showPlaceholderOnError } from "../hooks/useProductImage.js";
import { QuantityInput } from "./QuantityInput.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Modal } from "./Modal.js";
import { formatRupee } from "../utils/rupee.js";
import styles from "./MiniCartDrawer.module.css";

function DrawerRow({ item, product, onRemove }) {
  const dispatch = useDispatch();
  const image = useProductImage(product.thumbnail);

  return (
    <li className={styles.itemRow}>
      <img
        src={image}
        alt=""
        className={styles.itemThumb}
        onError={showPlaceholderOnError}
      />
      <div className={styles.itemInfo}>
        <Link
          to={`/products/${product.id}`}
          className={styles.itemTitle}
          onClick={() => dispatch(closeCartDrawer())}
        >
          {product.title}
        </Link>
        <span className={styles.itemPrice}>{formatRupee(product.price)}</span>
        <div className={styles.itemControls}>
          <QuantityInput
            value={item.quantity}
            max={product.stock}
            label={`Quantity of ${product.title}`}
            onChange={(quantity) =>
              dispatch(setQuantity({ productId: product.id, quantity }))
            }
            onStep={(delta) =>
              dispatch(
                changeQuantity({ productId: product.id, delta, max: product.stock })
              )
            }
            onExceed={() =>
              dispatch(
                showToast(`Only ${product.stock} of ${product.title} in stock`, "error")
              )
            }
          />
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => onRemove(product)}
            aria-label={`Remove ${product.title} from cart`}
          >
            <TrashIcon size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

DrawerRow.propTypes = {
  item: PropTypes.shape({ quantity: PropTypes.number.isRequired }).isRequired,
  product: PropTypes.object.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * Level-up L4: the mini-cart. It reads and writes the same Redux cart as the
 * cart page and the product page's "In your cart" controls, so a change in
 * any one of the three shows in the other two on the next render.
 */
export function MiniCartDrawer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOpen = useSelector(selectIsCartDrawerOpen);
  const cartItems = useSelector(selectCartItems);
  const cartCount = useSelector(selectCartCount);
  const totals = useSelector(selectCartTotals);
  const { products, status, retry } = useProductsByIds(
    isOpen ? cartItems.map((i) => i.productId) : []
  );
  const [toRemove, setToRemove] = useState(null);

  function close() {
    dispatch(closeCartDrawer());
  }

  function goTo(path) {
    close();
    navigate(path);
  }

  function confirmRemove() {
    dispatch(removeItem(toRemove.id));
    dispatch(showToast(`Removed ${toRemove.title} from cart`, "info"));
    setToRemove(null);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={`Your cart (${cartCount})`}
      variant="drawer"
    >
      <button
        type="button"
        className={styles.closeBtn}
        onClick={close}
        aria-label="Close cart"
      >
        <XIcon size={18} weight="bold" aria-hidden="true" />
      </button>

      <div className={styles.body}>
        {cartItems.length === 0 ? (
          <div className={styles.empty}>
            <p>Your cart is empty.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => goTo("/products")}
            >
              Browse the catalogue
            </button>
          </div>
        ) : status === "failed" ? (
          <div className={styles.empty} role="alert">
            <p>Some cart items couldn&apos;t be loaded.</p>
            <button type="button" className="btn btn-primary" onClick={retry}>
              Retry
            </button>
          </div>
        ) : (
          <ul className={styles.itemList}>
            {cartItems.map((item) =>
              products[item.productId] ? (
                <DrawerRow
                  key={item.productId}
                  item={item}
                  product={products[item.productId]}
                  onRemove={setToRemove}
                />
              ) : (
                <li
                  key={item.productId}
                  className={styles.skeletonRow}
                  aria-hidden="true"
                />
              )
            )}
          </ul>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className={styles.footer}>
          <div className={styles.subtotalRow}>
            <span className={styles.subtotalLabel}>Subtotal</span>
            <span className={styles.subtotalValue}>{formatRupee(totals.subtotal)}</span>
          </div>
          <p className={styles.taxNote}>GST and shipping are added at checkout.</p>
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => goTo("/cart")}
            >
              View cart
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => goTo("/checkout")}
            >
              Checkout
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(toRemove)}
        title="Remove item?"
        message={
          toRemove ? (
            <>
              Remove <strong>{toRemove.title}</strong> from your cart?
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Remove"
        cancelLabel="Keep it"
        onConfirm={confirmRemove}
        onCancel={() => setToRemove(null)}
      />
    </Modal>
  );
}
