import { memo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { HeartIcon, StarIcon } from "@phosphor-icons/react";
import { formatRupee } from "../utils/rupee.js";
import { hasDiscount, originalPrice, LOW_STOCK_BELOW } from "../utils/pricing.js";
import { addToCart } from "../features/cart/cartSlice.js";
import {
  toggleWishlist,
  selectIsWishlisted,
} from "../features/wishlist/wishlistSlice.js";
import { showToast, openCartDrawer } from "../features/ui/uiSlice.js";
import { useProductImage, showPlaceholderOnError } from "../hooks/useProductImage.js";
import { departmentLabel, productKindLabel } from "../utils/catalogue.js";
import styles from "./ProductCard.module.css";

/** The default action: Add to cart, disabled when out of stock. */
function AddToCartButton({ product }) {
  const dispatch = useDispatch();
  const isOos = product.stock === 0;

  function handleAddToCart() {
    if (isOos) return;
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
    dispatch(showToast(`Added ${product.title} to cart`, "success"));
    dispatch(openCartDrawer());
  }

  return (
    <button
      type="button"
      className={`btn ${isOos ? "btn-secondary" : "btn-primary"} ${styles.addBtn}`}
      onClick={handleAddToCart}
      disabled={isOos}
    >
      {isOos ? "Out of stock" : "Add to cart"}
    </button>
  );
}

AddToCartButton.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string,
    stock: PropTypes.number,
  }).isRequired,
};

/**
 * One card, used on the catalogue grid, Related products, Recently viewed and
 * the Wishlist page. Each place passes its own `actions` (Add to cart,
 * View details, Move to cart / Remove, …); the card itself never changes.
 *
 * Wrapped in React.memo: adding one product to the cart re-renders the header
 * badge and drawer, but not the other cards, whose props did not change.
 */
export const ProductCard = memo(function ProductCard({
  product,
  actions,
  headingLevel = 3,
}) {
  const dispatch = useDispatch();
  const isWishlisted = useSelector(selectIsWishlisted(product.id));
  const imageSrc = useProductImage(product.thumbnail);

  const isOos = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < LOW_STOCK_BELOW;
  const discounted = hasDiscount(product);
  const Heading = `h${headingLevel}`;
  const rating = product.rating ?? 0;

  async function handleWishlistToggle() {
    try {
      await dispatch(toggleWishlist(product.id));
      dispatch(
        showToast(
          isWishlisted
            ? `Removed ${product.title} from wishlist`
            : `Added ${product.title} to wishlist`,
          "success"
        )
      );
    } catch {
      dispatch(
        showToast(
          `Couldn't update your wishlist. ${product.title} was not saved.`,
          "error"
        )
      );
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        <Link to={`/products/${product.id}`} className={styles.imageLink} tabIndex={-1}>
          <img
            src={imageSrc}
            alt={product.title}
            className={styles.image}
            loading="lazy"
            decoding="async"
            onError={showPlaceholderOnError}
          />
        </Link>
        <button
          type="button"
          className={`${styles.wishlistBtn} ${isWishlisted ? styles.wishlisted : ""}`}
          onClick={handleWishlistToggle}
          aria-pressed={isWishlisted}
          aria-label={`${isWishlisted ? "Remove" : "Save"} ${product.title} ${isWishlisted ? "from" : "to"} wishlist`}
        >
          <HeartIcon
            size={18}
            weight={isWishlisted ? "fill" : "regular"}
            aria-hidden="true"
          />
        </button>

        <div className={styles.badges}>
          {discounted && (
            <span className={styles.discountBadge}>
              {Math.round(product.discountPercentage)}% off
            </span>
          )}
          {isOos && <span className={styles.oosBadge}>Out of stock</span>}
          {isLowStock && (
            <span className={styles.lowStockBadge}>Only {product.stock} left</span>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.metaRow}>
          <span className="dept-chip" data-dept={product.category}>
            <span className="visually-hidden">{departmentLabel(product.category)}: </span>
            {productKindLabel(product)}
          </span>
          {product.brand && <span className={styles.brand}>{product.brand}</span>}
        </div>

        <Heading className={styles.title}>
          <Link to={`/products/${product.id}`}>{product.title}</Link>
        </Heading>

        <div className={styles.ratingRow}>
          <StarIcon
            size={15}
            weight="fill"
            className={styles.ratingStar}
            aria-hidden="true"
          />
          <span className={styles.ratingValue}>
            {rating.toFixed(1)}
            <span className="visually-hidden"> out of 5 stars</span>
          </span>
        </div>

        <div className={styles.priceRow}>
          <span className={styles.currentPrice}>{formatRupee(product.price)}</span>
          {discounted && (
            <s className={styles.originalPrice}>
              <span className="visually-hidden">Original price </span>
              {formatRupee(originalPrice(product))}
            </s>
          )}
        </div>

        <div className={styles.actions}>
          {actions ?? <AddToCartButton product={product} />}
        </div>
      </div>
    </article>
  );
});

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    subcategory: PropTypes.string,
    brand: PropTypes.string,
    price: PropTypes.number.isRequired,
    discountPercentage: PropTypes.number,
    rating: PropTypes.number,
    stock: PropTypes.number.isRequired,
    thumbnail: PropTypes.string,
  }).isRequired,
  actions: PropTypes.node,
  headingLevel: PropTypes.oneOf([2, 3, 4]),
};
