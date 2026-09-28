import { createContext, useContext, useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { readStorage, writeStorage, STORAGE_KEYS, validators } from "../utils/storage.js";

/**
 * Delivery PIN/location. Explicitly React Context, not Redux — decision #2
 * in docs/specs.md §1. It's read by a handful of pages, written from one
 * place (the header), and has no async round-trip of its own.
 */
const LocationContext = createContext(null);

const PIN_RE = /^\d{6}$/;

export function LocationProvider({ children }) {
  const [pin, setPinState] = useState(() =>
    readStorage(STORAGE_KEYS.deliveryPin, "", validators.pin)
  );

  const setPin = useCallback((next) => {
    if (next !== "" && !PIN_RE.test(next)) return false;
    setPinState(next);
    writeStorage(STORAGE_KEYS.deliveryPin, next);
    return true;
  }, []);

  const value = useMemo(
    () => ({ pin, setPin, isValid: pin !== "" && PIN_RE.test(pin) }),
    [pin, setPin]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

LocationProvider.propTypes = { children: PropTypes.node.isRequired };

export function useLocationPin() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationPin must be used within LocationProvider");
  return ctx;
}
