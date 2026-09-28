import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyIcon } from "@phosphor-icons/react";
import { useRole } from "../context/RoleContext.js";
import { safeReturnPath } from "../utils/safeReturnPath.js";
import styles from "./SignIn.module.css";

/**
 * The sign-in prompt shoppers see when they open an admin page. There is no
 * real authentication; the role switch (here or in the header) is the whole
 * "sign in". Once the role is Store manager, the page they originally asked
 * for opens.
 */
export function SignIn() {
  const { isStoreManager, setRole } = useRole();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = safeReturnPath(searchParams.get("from"));

  // Covers both this page's button and the header's role toggle.
  useEffect(() => {
    if (isStoreManager) navigate(returnTo, { replace: true });
  }, [isStoreManager, navigate, returnTo]);

  return (
    <div className="container section">
      <div className={styles.card}>
        <LockKeyIcon size={40} className={styles.icon} aria-hidden="true" />
        <h1>Store manager sign-in</h1>
        <p className="muted">
          The page you asked for is for store managers. This demo has no passwords: switch
          your role to continue.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setRole("store-manager")}
          >
            Continue as store manager
          </button>
          <Link to="/" className="btn btn-secondary">
            Back to the shop
          </Link>
        </div>
      </div>
    </div>
  );
}
