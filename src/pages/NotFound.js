import { Link } from "react-router-dom";
import PropTypes from "prop-types";

/** Shown for unknown URLs and for product ids that don't exist. */
export function NotFound({ what = "page" }) {
  return (
    <div className="container section">
      <div className="empty-state">
        <h1>{what === "product" ? "Product not found" : "Page not found"}</h1>
        <p className="muted">
          {what === "product"
            ? "This product doesn't exist or has been removed from the catalogue."
            : "The page you're looking for doesn't exist or has moved."}
        </p>
        <Link to={what === "product" ? "/products" : "/"} className="btn btn-primary">
          {what === "product" ? "Browse the catalogue" : "Back to home"}
        </Link>
      </div>
    </div>
  );
}

NotFound.propTypes = {
  what: PropTypes.oneOf(["page", "product"]),
};
