import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { PackageIcon } from "@phosphor-icons/react";
import { selectProductsById } from "../features/products/productsSlice.js";
import { addKitToCart } from "../features/cart/cartSlice.js";
import { showToast, openCartDrawer } from "../features/ui/uiSlice.js";
import { useProductImage, showPlaceholderOnError } from "../hooks/useProductImage.js";
import { formatRupee } from "../utils/rupee.js";
import { roundPaise } from "../utils/pricing.js";
import { departmentLabel, goalLabel, productKindLabel } from "../utils/catalogue.js";
import { GOAL_ICONS } from "./catalogueIcons.js";
import styles from "./KitCard.module.css";

function KitThumb({ src }) {
  const resolved = useProductImage(src);
  return (
    <img
      src={resolved}
      alt=""
      className={styles.thumb}
      loading="lazy"
      decoding="async"
      onError={showPlaceholderOnError}
    />
  );
}

KitThumb.propTypes = { src: PropTypes.string };

/**
 * One MoveWell Kit: a cross-category set of products (sports + footwear +
 * health) that is added to the ordinary shared cart as separate lines. The
 * price shown is simply the sum of the in-stock items; there is no bundle
 * discount, so the cart and checkout totals always agree with it.
 */
export function KitCard({ kit, headingLevel = 3 }) {
  const dispatch = useDispatch();
  const byId = useSelector(selectProductsById);
  const Heading = `h${headingLevel}`;
  const GoalIcon = GOAL_ICONS[kit.goal];

  const lines = kit.items
    .map((item) => ({ ...item, product: byId[item.productId] }))
    .filter((line) => line.product);
  const available = lines.filter((line) => line.product.stock > 0);
  const total = roundPaise(available.reduce((sum, line) => sum + line.product.price, 0));
  const departments = new Set(lines.map((line) => line.product.category));

  function handleAddKit() {
    const { added, skipped } = dispatch(addKitToCart(available.map((l) => l.product)));
    if (added.length === 0) {
      dispatch(
        showToast(`Nothing from the ${kit.name} could be added. Check stock.`, "error")
      );
      return;
    }
    dispatch(
      showToast(
        skipped.length
          ? `Added ${added.length} kit items to cart. ${skipped.length} already at the stock limit.`
          : `Added the ${kit.name} (${added.length} items) to cart`,
        "success"
      )
    );
    dispatch(openCartDrawer());
  }

  return (
    <article className={styles.card} aria-labelledby={`kit-${kit.id}`}>
      <header className={styles.header}>
        <span className={styles.goal}>
          {GoalIcon && <GoalIcon size={16} weight="bold" aria-hidden="true" />}
          {goalLabel(kit.goal)}
        </span>
        <Heading id={`kit-${kit.id}`} className={styles.title}>
          {kit.name}
        </Heading>
        <p className={styles.blurb}>{kit.blurb}</p>
        <p className={styles.depts}>
          {[...departments].map((d) => (
            <span key={d} className="dept-chip" data-dept={d}>
              {departmentLabel(d)}
            </span>
          ))}
        </p>
      </header>

      <ul className={styles.items}>
        {lines.map(({ label, product }) => (
          <li key={product.id} className={styles.item}>
            <KitThumb src={product.thumbnail} />
            <div className={styles.itemText}>
              <span className={styles.slot}>
                {label} · {productKindLabel(product)}
              </span>
              <Link to={`/products/${product.id}`} className={styles.itemTitle}>
                {product.title}
              </Link>
              {product.stock === 0 && (
                <span className={styles.oos}>Out of stock, not included</span>
              )}
            </div>
            <span className={styles.price}>{formatRupee(product.price)}</span>
          </li>
        ))}
      </ul>

      <footer className={styles.footer}>
        <p className={styles.total}>
          <span className="muted">
            {available.length} {available.length === 1 ? "item" : "items"}
          </span>
          <strong>{formatRupee(total)}</strong>
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAddKit}
          disabled={available.length === 0}
        >
          <PackageIcon size={18} weight="bold" aria-hidden="true" />
          Add kit to cart
        </button>
      </footer>
    </article>
  );
}

KitCard.propTypes = {
  kit: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    goal: PropTypes.string.isRequired,
    blurb: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        productId: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,
  headingLevel: PropTypes.oneOf([2, 3]),
};
