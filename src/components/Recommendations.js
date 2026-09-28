import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import {
  loadRecommendations,
  selectRecommendations,
  selectProductsById,
  selectCatalogueVersion,
} from "../features/products/productsSlice.js";
import { ProductCard } from "./ProductCard.js";
import { ProductSkeleton } from "./ProductSkeleton.js";

/**
 * A grid of cross-category picks for a fitness goal ("" = featured mix),
 * loaded through the products slice so the records land in the shared
 * product cache the cart and detail pages already read from.
 */
export function Recommendations({ goal = "", limit = 8, className, gridClassName }) {
  const dispatch = useDispatch();
  const { ids, status } = useSelector(selectRecommendations(goal));
  const byId = useSelector(selectProductsById);
  const catalogueVersion = useSelector(selectCatalogueVersion);

  useEffect(() => {
    dispatch(loadRecommendations({ goal, limit }));
  }, [dispatch, goal, limit, catalogueVersion]);

  const products = ids.map((id) => byId[id]).filter(Boolean);

  if (products.length === 0 && status !== "failed") {
    return (
      <div className={className}>
        <ProductSkeleton count={Math.min(limit, 4)} />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={`empty-state ${className ?? ""}`} role="alert">
        <h3>We couldn&apos;t load these picks</h3>
        <p className="muted">The catalogue service didn&apos;t respond. Please try again.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => dispatch(loadRecommendations({ goal, limit }))}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`${gridClassName ?? ""} ${className ?? ""}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

Recommendations.propTypes = {
  goal: PropTypes.string,
  limit: PropTypes.number,
  className: PropTypes.string,
  gridClassName: PropTypes.string,
};
