import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import {
  CaretLeftIcon,
  CaretRightIcon,
  HeartIcon,
  TruckIcon,
  StarIcon,
} from "@phosphor-icons/react";
import {
  fetchProduct,
  selectProductById,
  selectProductDetailStatus,
  selectCatalogueVersion,
} from "../features/products/productsSlice.js";
import { recordView } from "../features/recentlyViewed/recentlyViewedSlice.js";
import {
  addItem,
  changeQuantity,
  removeItem,
  selectCartQuantity,
} from "../features/cart/cartSlice.js";
import {
  toggleWishlist,
  selectIsWishlisted,
} from "../features/wishlist/wishlistSlice.js";
import {
  fetchReviews,
  submitReview,
  selectReviewsForProduct,
  selectReviewsStatus,
} from "../features/reviews/reviewsSlice.js";
import { showToast, openCartDrawer } from "../features/ui/uiSlice.js";
import { useLocationPin } from "../context/LocationContext.js";
import { getStock, getProducts, getRecommendations } from "../services/productsService.js";
import { departmentLabel, goalLabel, productKindLabel } from "../utils/catalogue.js";
import { formatRupee } from "../utils/rupee.js";
import { hasDiscount, originalPrice, LOW_STOCK_BELOW } from "../utils/pricing.js";
import { deliveryPromise } from "../utils/delivery.js";
import { getShopperId } from "../utils/shopper.js";
import { useProductImage, showPlaceholderOnError } from "../hooks/useProductImage.js";
import { Tabs, TabList, Tab, TabPanel } from "../components/Tabs.js";
import { QuantityInput } from "../components/QuantityInput.js";
import { ConfirmDialog } from "../components/ConfirmDialog.js";
import { ReviewList } from "../components/ReviewList.js";
import { ProductCard } from "../components/ProductCard.js";
import { NotFound } from "./NotFound.js";
import styles from "./ProductDetails.module.css";

const STOCK_REFRESH_MS = 30_000;
const RELATED_COUNT = 4;

/**
 * Specs come from three stores with different keys. Each department lists
 * the keys shoppers compare first; anything else the product has follows,
 * and keys it doesn't have are simply not shown. (MediKart's category-wide
 * Composition / Dosage form / Pack size values are kept out of `specs` by
 * the merge — see docs/CONFLICTS.md — so for health products usually only
 * Manufacturer, Storage and Expiry appear.)
 */
const SPEC_ORDER = {
  sports: ["Material", "Size", "Weight", "Suitable for", "Skill level", "Warranty"],
  footwear: ["Size", "Colour", "Material", "Sole", "Closure", "Occasion"],
  health: [
    "Dosage form",
    "Pack size",
    "Composition",
    "Manufacturer",
    "Storage instructions",
    "Expiry period",
  ],
};

/** Health spec labels written for shoppers, not pharmacists. */
const SPEC_LABELS = { "Dosage form": "Product type", "Pack size": "Quantity" };

function orderedSpecs(product) {
  const entries = Object.entries(product.specs ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && String(value).trim() !== ""
  );
  const order = SPEC_ORDER[product.category] ?? [];
  const rank = (key) => {
    const i = order.indexOf(key);
    return i === -1 ? order.length : i;
  };
  return [...entries].sort(([a], [b]) => rank(a) - rank(b));
}

function GalleryImage({ src, alt, className }) {
  const resolved = useProductImage(src);
  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      onError={showPlaceholderOnError}
    />
  );
}

GalleryImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
};

/** Thumbnails + main image. Left/Right arrow keys move between images. */
function Gallery({ product }) {
  const images = product.images?.length ? product.images : [product.thumbnail];
  const [index, setIndex] = useState(0);
  const count = images.length;

  function move(delta) {
    setIndex((i) => (i + delta + count) % count);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  }

  return (
    <section
      className={styles.galleryContainer}
      aria-roledescription="image gallery"
      aria-label={`${product.title} images. Use the left and right arrow keys to change image.`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.mainImageWrapper}>
        <GalleryImage
          src={images[index]}
          alt={`${product.title}, image ${index + 1} of ${count}`}
          className={styles.mainImage}
        />
        {count > 1 && (
          <>
            <button
              type="button"
              className={`${styles.galleryNavBtn} ${styles.prevImageBtn}`}
              onClick={() => move(-1)}
              aria-label="Previous image"
            >
              <CaretLeftIcon size={20} weight="bold" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.galleryNavBtn} ${styles.nextImageBtn}`}
              onClick={() => move(1)}
              aria-label="Next image"
            >
              <CaretRightIcon size={20} weight="bold" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className={styles.thumbnails}>
          {images.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              className={`${styles.thumbBtn} ${i === index ? styles.activeThumb : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={i === index}
            >
              <GalleryImage src={img} alt="" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

Gallery.propTypes = {
  product: PropTypes.shape({
    title: PropTypes.string.isRequired,
    thumbnail: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

/** Level-up L4: shown when this product is already in the cart, with its own controls. */
function InYourCart({ product, quantity, stock }) {
  const dispatch = useDispatch();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.inCart} role="group" aria-label="In your cart">
      <span className={styles.inCartLabel}>
        In your cart: <strong>{quantity}</strong>
      </span>
      <div className={styles.inCartControls}>
        <button
          type="button"
          className={styles.inCartBtn}
          onClick={() =>
            quantity <= 1
              ? setConfirming(true)
              : dispatch(changeQuantity({ productId: product.id, delta: -1, max: stock }))
          }
          aria-label="Remove one from cart"
        >
          −
        </button>
        <button
          type="button"
          className={styles.inCartBtn}
          onClick={() =>
            dispatch(changeQuantity({ productId: product.id, delta: 1, max: stock }))
          }
          disabled={quantity >= stock}
          aria-label="Add one more to cart"
        >
          +
        </button>
        <button
          type="button"
          className={styles.inCartRemove}
          onClick={() => setConfirming(true)}
        >
          Remove
        </button>
      </div>
      <ConfirmDialog
        isOpen={confirming}
        title="Remove item?"
        message={
          <>
            Remove <strong>{product.title}</strong> from your cart?
          </>
        }
        confirmLabel="Remove"
        cancelLabel="Keep it"
        onConfirm={() => {
          dispatch(removeItem(product.id));
          dispatch(showToast(`Removed ${product.title} from cart`, "info"));
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

InYourCart.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  quantity: PropTypes.number.isRequired,
  stock: PropTypes.number.isRequired,
};

function DeliveryEstimate() {
  const { pin, isValid } = useLocationPin();

  return (
    <div className={styles.deliveryBox}>
      <TruckIcon size={22} className={styles.deliveryIcon} aria-hidden="true" />
      {isValid ? (
        <p className={styles.deliveryStatus}>{deliveryPromise(pin)}</p>
      ) : (
        <p className={styles.deliveryStatus}>
          Set your delivery PIN to see a delivery date.{" "}
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => document.getElementById("delivery-pin")?.focus()}
          >
            Set PIN
          </button>
        </p>
      )}
    </div>
  );
}

/**
 * Related products (same category) are fetched per product through the data
 * service and kept in local state: they belong to this page only.
 * Level-up L3: a response for a product the shopper has already left is
 * ignored (`cancelled`), so it can never show on the next product's page.
 */
function RelatedProducts({ product }) {
  const [related, setRelated] = useState([]);
  const catalogueVersion = useSelector(selectCatalogueVersion);

  useEffect(() => {
    let cancelled = false;
    setRelated([]);
    getProducts({
      category: product.category,
      subcategory: product.subcategory,
      limit: RELATED_COUNT + 1,
    })
      .then(({ products }) => {
        if (!cancelled)
          setRelated(products.filter((p) => p.id !== product.id).slice(0, RELATED_COUNT));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id, product.category, product.subcategory, catalogueVersion]);

  if (related.length === 0) return null;

  return (
    <section className={styles.relatedSection} aria-labelledby="related-heading">
      <h2 id="related-heading">More {productKindLabel(product)}</h2>
      <div className={styles.relatedGrid}>
        {related.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            actions={
              <Link to={`/products/${p.id}`} className="btn btn-secondary">
                View details
              </Link>
            }
          />
        ))}
      </div>
    </section>
  );
}

RelatedProducts.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    category: PropTypes.string.isRequired,
    subcategory: PropTypes.string,
  }).isRequired,
};

/**
 * MoveWell cross-sell: products from the OTHER two departments that share
 * this product's first fitness goal (running shoes -> running apparel and
 * recovery items). Same stale-response guard as RelatedProducts.
 */
function CompleteTheSet({ product }) {
  const [items, setItems] = useState([]);
  const catalogueVersion = useSelector(selectCatalogueVersion);
  const goal = product.goals?.[0] ?? "";

  useEffect(() => {
    let cancelled = false;
    setItems([]);
    if (!goal) return undefined;
    getRecommendations({ goal, limit: 12 })
      .then(({ products }) => {
        if (!cancelled)
          setItems(
            products.filter((p) => p.category !== product.category).slice(0, RELATED_COUNT)
          );
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [goal, product.category, catalogueVersion]);

  if (items.length === 0) return null;

  return (
    <section className={styles.relatedSection} aria-labelledby="set-heading">
      <h2 id="set-heading">Complete your {goalLabel(goal).toLowerCase()} set</h2>
      <p className="muted">From other MoveWell categories, picked for the same goal.</p>
      <div className={styles.relatedGrid}>
        {items.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            actions={
              <Link to={`/products/${p.id}`} className="btn btn-secondary">
                View details
              </Link>
            }
          />
        ))}
      </div>
    </section>
  );
}

CompleteTheSet.propTypes = {
  product: PropTypes.shape({
    category: PropTypes.string.isRequired,
    goals: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

export function ProductDetails() {
  const { productId: rawId } = useParams();
  const productId = Number(rawId);
  const validId = Number.isInteger(productId) && productId > 0;
  const dispatch = useDispatch();

  const product = useSelector(selectProductById(productId));
  const detailStatus = useSelector(selectProductDetailStatus(productId));
  const isWishlisted = useSelector(selectIsWishlisted(productId));
  const inCart = useSelector(selectCartQuantity(productId));
  const reviews = useSelector(selectReviewsForProduct(productId));
  const reviewsStatus = useSelector(selectReviewsStatus(productId));
  const catalogueVersion = useSelector(selectCatalogueVersion);

  const [quantity, setQuantity] = useState(1);
  // Latest stock from the 30-second refresh, remembered per product id so a
  // value for the previous product can never show on this one.
  const [liveStock, setLiveStock] = useState({ id: null, stock: null });
  const [qtyMessage, setQtyMessage] = useState("");
  const qtyRef = useRef(null);
  const shopperId = getShopperId();

  // Load the product (skipped by the thunk when it is already cached) and its reviews.
  useEffect(() => {
    if (!validId) return;
    dispatch(fetchProduct({ id: productId }));
    dispatch(fetchReviews(productId));
    setQuantity(1);
    setQtyMessage("");
  }, [dispatch, productId, validId, catalogueVersion]);

  // Recently viewed: recorded only once the product is known to exist.
  useEffect(() => {
    if (product) dispatch(recordView(product.id));
  }, [dispatch, product]);

  // Module 3: refresh stock every 30 s while the page is open. Leaving the
  // page (or opening another product) clears the interval, and `active`
  // drops any response that arrives afterwards (Level-up L3).
  useEffect(() => {
    if (!validId) return undefined;
    let active = true;
    const timer = setInterval(() => {
      getStock(productId)
        .then(({ stock }) => {
          if (active) setLiveStock({ id: productId, stock });
        })
        .catch(() => {});
    }, STOCK_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [productId, validId]);

  if (!validId || detailStatus === "notFound") return <NotFound what="product" />;

  if (!product) {
    if (detailStatus === "failed") {
      return (
        <div className="container section">
          <div className="empty-state" role="alert">
            <h1>We couldn&apos;t load this product</h1>
            <p className="muted">The catalogue service didn&apos;t respond.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => dispatch(fetchProduct({ id: productId, force: true }))}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="container section" role="status">
        <div className={styles.loading} aria-label="Loading product" />
      </div>
    );
  }

  const stock = liveStock.id === product.id ? liveStock.stock : product.stock;
  const isOos = stock === 0;
  const discounted = hasDiscount(product);
  const canAdd = Math.max(0, stock - inCart);

  function handleExceed(requested) {
    setQtyMessage(
      canAdd === 0
        ? "You already have all available stock in your cart."
        : `Only ${canAdd} more available. You asked for ${requested}.`
    );
    qtyRef.current?.focus();
    qtyRef.current?.select();
  }

  function handleAddToCart() {
    if (isOos || canAdd === 0) {
      handleExceed(quantity);
      return;
    }
    if (quantity > canAdd) {
      handleExceed(quantity);
      return;
    }
    dispatch(addItem({ productId: product.id, quantity }));
    dispatch(showToast(`Added ${quantity} × ${product.title} to cart`, "success"));
    dispatch(openCartDrawer());
    setQuantity(1);
    setQtyMessage("");
  }

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

  async function handleAddReview(review) {
    await dispatch(
      submitReview({ productId: product.id, review: { ...review, shopperId } })
    ).unwrap();
    dispatch(showToast("Thanks for your review!", "success"));
  }

  const alreadyReviewed = reviews.some((r) => r.shopperId === shopperId);

  return (
    <div className="container section">
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to={`/products?category=${encodeURIComponent(product.category)}`}>
              {departmentLabel(product.category)}
            </Link>
          </li>
          {product.subcategory && (
            <li>
              <Link
                to={`/products?category=${encodeURIComponent(product.category)}&subcategory=${encodeURIComponent(product.subcategory)}`}
              >
                {product.subcategory}
              </Link>
            </li>
          )}
          <li aria-current="page">{product.title}</li>
        </ol>
      </nav>

      <div className={styles.mainGrid}>
        <Gallery key={product.id} product={product} />

        <div className={styles.infoContainer}>
          <div className={styles.metaHeader}>
            <span className="dept-chip" data-dept={product.category}>
              {departmentLabel(product.category)}
            </span>
            {product.subcategory && (
              <span className={styles.categoryBadge}>{product.subcategory}</span>
            )}
            {product.brand && <span className={styles.brandName}>{product.brand}</span>}
          </div>

          <h1 className={styles.title}>{product.title}</h1>

          {product.goals?.length > 0 && (
            <p className={styles.goalRow}>
              <span className="muted">Good for:</span>
              {product.goals.map((g) => (
                <Link key={g} to={`/products?goal=${g}`} className={styles.goalChip}>
                  {goalLabel(g)}
                </Link>
              ))}
            </p>
          )}

          <div className={styles.ratingRow}>
            <StarIcon
              size={18}
              weight="fill"
              className={styles.star}
              aria-hidden="true"
            />
            <span className={styles.ratingValue}>
              {(product.rating ?? 0).toFixed(1)}
              <span className="visually-hidden"> out of 5</span>
            </span>
            <span className={styles.reviewCount}>
              ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
            </span>
          </div>

          <div className={styles.priceRow}>
            <span className={styles.currentPrice}>{formatRupee(product.price)}</span>
            {discounted && (
              <>
                <s className={styles.originalPrice}>
                  <span className="visually-hidden">Original price </span>
                  {formatRupee(originalPrice(product))}
                </s>
                <span className={styles.discountTag}>
                  {Math.round(product.discountPercentage)}% off
                </span>
              </>
            )}
          </div>

          <DeliveryEstimate />

          <div className={styles.purchaseSection}>
            <p className={styles.stockStatus} role="status">
              {isOos ? (
                <span className={styles.oosLabel}>Out of stock</span>
              ) : stock < LOW_STOCK_BELOW ? (
                <span className={styles.lowStockLabel}>Only {stock} left</span>
              ) : (
                <span className={styles.inStockLabel}>In stock</span>
              )}
            </p>

            {inCart > 0 && (
              <InYourCart product={product} quantity={inCart} stock={stock} />
            )}

            {!isOos && (
              <div className={styles.quantityRow}>
                <label htmlFor="detail-qty" className={styles.qtyLabel}>
                  Quantity
                </label>
                <QuantityInput
                  id="detail-qty"
                  ref={qtyRef}
                  value={quantity}
                  onChange={(next) => {
                    setQuantity(next);
                    setQtyMessage("");
                  }}
                  onExceed={handleExceed}
                  min={1}
                  max={Math.max(1, canAdd)}
                  showPlusFive
                />
              </div>
            )}
            <p className={styles.qtyMessage} role="alert">
              {qtyMessage}
            </p>

            <div className={styles.actionsGroup}>
              <button
                type="button"
                className={`btn ${isOos ? "btn-secondary" : "btn-primary"} ${styles.addToCartBtn}`}
                onClick={handleAddToCart}
                disabled={isOos}
              >
                {isOos ? "Out of stock" : "Add to cart"}
              </button>

              <button
                type="button"
                className={`btn btn-secondary ${styles.wishlistToggleBtn}`}
                onClick={handleWishlistToggle}
                aria-pressed={isWishlisted}
              >
                <HeartIcon
                  size={18}
                  weight={isWishlisted ? "fill" : "regular"}
                  aria-hidden="true"
                />
                {isWishlisted ? "Saved to wishlist" : "Save to wishlist"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Tabs key={product.id} defaultValue="description" className={styles.tabs}>
        <TabList label="Product information">
          <Tab value="description">Description</Tab>
          <Tab value="specs">Specifications</Tab>
          <Tab value="reviews">Reviews ({reviews.length})</Tab>
        </TabList>

        <TabPanel value="description">
          <p className={styles.description}>
            {product.description || "No description yet."}
          </p>
        </TabPanel>

        <TabPanel value="specs">
          {orderedSpecs(product).length > 0 ? (
            <dl className={styles.specsList}>
              {orderedSpecs(product).map(([key, val]) => (
                <div key={key} className={styles.specRow}>
                  <dt>{SPEC_LABELS[key] ?? key}</dt>
                  <dd>{Array.isArray(val) ? val.join(", ") : String(val)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted">No specifications listed.</p>
          )}
          {product.category === "health" && (
            <p className={styles.healthNote}>
              Product information is provided for shopping purposes only and is not
              medical advice. Always read the label and follow the manufacturer&apos;s
              directions.
            </p>
          )}
        </TabPanel>

        <TabPanel value="reviews">
          <ReviewList
            reviews={reviews}
            status={reviewsStatus}
            alreadyReviewed={alreadyReviewed}
            onAddReview={handleAddReview}
            onRetry={() => dispatch(fetchReviews(productId))}
          />
        </TabPanel>
      </Tabs>

      <CompleteTheSet product={product} />
      <RelatedProducts product={product} />
    </div>
  );
}
