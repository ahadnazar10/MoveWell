import { Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useRole } from "../context/RoleContext.js";

/**
 * Protected route for the admin area. Shoppers are sent to the sign-in
 * prompt with the page they asked for in ?from=, so switching role takes
 * them straight back to it.
 */
export function RequireStoreManager({ children }) {
  const { isStoreManager } = useRole();
  const location = useLocation();

  if (!isStoreManager) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?from=${from}`} replace />;
  }
  return children;
}

RequireStoreManager.propTypes = {
  children: PropTypes.node.isRequired,
};
