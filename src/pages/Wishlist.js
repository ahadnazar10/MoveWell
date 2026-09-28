import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { selectWishlistIds, toggleWishlist } from "../features/wishlist/wishlistSlice.js";
import { addToCart } from "../features/cart/cartSlice.js";
import { showToast } from "../features/ui/uiSlice.js";
import { useProductsByIds } from "../hooks/useProductsByIds.js";
import { ProductCard } from "../components/ProductCard.js";
import { ProductSkeleton } from "../components/ProductSkeleton.js";
import styles from "./Wishlist.module.css";

/** Wishlist cards get their own actions: Move to cart, and Remove. */
function WishlistActions({ product }) {
  const dispatch = useDispatch();
  const isOos = product.stock === 0;

  async function removeFromWishlist(successMessage) {
    try {
      await dispatch(toggleWishlist(product.id));
      if (successMessage) dispatch(showToast(successMessage, "success"));
    } catch {
      dispatch(
        showToast(
          `Couldn't update your wishlist. ${product.title} is still saved.`,
          "error"
        )
      );
    }
  }

  function handleMoveToCart() {
    const { added, inCart } = dispatch(addToCart(product));
    if (added === 0) {
      dispatch(
        showToast(
          `You already have all ${inCart} of ${product.title} in your cart`,
          "error"
        )
      );
      return;
    }
    removeFromWishlist(`Moved ${product.title} to your cart`);
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleMoveToCart}
        disabled={isOos}
      >
        {isOos ? "Out of stock" : "Move to cart"}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => removeFromWishlist(`Removed ${product.title} from your wishlist`)}
      >
        Remove
      </button>
    </>
  );
}

WishlistActions.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    stock: PropTypes.number.isRequired,
  }).isRequired,
};

export function Wishlist() {
  const wishlistIds = useSelector(selectWishlistIds);
  const { products, missingIds, status, retry } = useProductsByIds(wishlistIds);
  const visibleIds = wishlistIds.filter((id) => !missingIds.includes(id));

  if (wishlistIds.length === 0) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h1>Your wishlist is empty</h1>
          <p className="muted">Tap the heart on any product to save it here for later.</p>
          <Link to="/products" className="btn btn-primary">
            Browse the catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <header className={styles.header}>
        <h1>Wishlist</h1>
        <p className="muted">
          {visibleIds.length} saved {visibleIds.length === 1 ? "product" : "products"}.
          Move them to your cart when you&apos;re ready.
        </p>
      </header>

      {status === "failed" ? (
        <div className="empty-state" role="alert">
          <h2>Some saved products couldn&apos;t be loaded</h2>
          <button type="button" className="btn btn-primary" onClick={retry}>
            Retry
          </button>
        </div>
      ) : status === "loading" ? (
        <ProductSkeleton count={Math.min(visibleIds.length, 8)} />
      ) : (
        <div className={styles.grid}>
          {visibleIds.map((id) =>
            products[id] ? (
              <ProductCard
                key={id}
                product={products[id]}
                headingLevel={2}
                actions={<WishlistActions product={products[id]} />}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
