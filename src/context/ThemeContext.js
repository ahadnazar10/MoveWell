import {
  createContext,
  useContext,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import PropTypes from "prop-types";
import { readStorage, writeStorage, STORAGE_KEYS, validators } from "../utils/storage.js";

/**
 * Theme: "light" | "dark" | "system". The inline script in index.html already
 * set document.documentElement.dataset.theme before React mounted (zero
 * flash — see docs/specs.md §10g); this context takes over from there for
 * reactive changes (System mode following the OS live, or a manual change
 * from Account → Preferences).
 */
const ThemeContext = createContext(null);

const media =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function subscribeToSystemTheme(callback) {
  media?.addEventListener("change", callback);
  return () => media?.removeEventListener("change", callback);
}

function getSystemThemeSnapshot() {
  return media?.matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot
  );
  const [preference, setPreference] = useState(() =>
    readStorage(
      STORAGE_KEYS.theme,
      "system",
      validators.oneOf(["system", "light", "dark"])
    )
  );

  const resolved = preference === "system" ? systemTheme : preference;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setTheme = useCallback((next) => {
    setPreference(next);
    writeStorage(STORAGE_KEYS.theme, next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setTheme }),
    [preference, resolved, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

ThemeProvider.propTypes = { children: PropTypes.node.isRequired };

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
