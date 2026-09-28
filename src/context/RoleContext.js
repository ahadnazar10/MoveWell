import { createContext, useContext, useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { readStorage, writeStorage, STORAGE_KEYS, validators } from "../utils/storage.js";

/**
 * Shopper vs. Store-manager. No real auth (out of scope — docs/specs.md §11) —
 * this is a header toggle that changes which routes/nav items are visible.
 */
const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() =>
    readStorage(
      STORAGE_KEYS.role,
      "shopper",
      validators.oneOf(["shopper", "store-manager"])
    )
  );

  const setRole = useCallback((next) => {
    setRoleState(next);
    writeStorage(STORAGE_KEYS.role, next);
  }, []);

  const value = useMemo(
    () => ({ role, setRole, isStoreManager: role === "store-manager" }),
    [role, setRole]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

RoleProvider.propTypes = { children: PropTypes.node.isRequired };

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
