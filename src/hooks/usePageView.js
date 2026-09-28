import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Logs a `page_view` analytics event exactly once per page visit. Called
 * once in App instead of duplicated as a useEffect in every page — see
 * docs/specs.md §10f.
 *
 * A "page" is a pathname: changing filters or typing a search on /products
 * updates the query string but is the same page visit, so it is not logged
 * again. Navigating to another page (including with Back/Forward) is.
 *
 * StrictMode runs effects twice in development; the ref remembers the page
 * already logged, so the second run is a no-op. Refs survive StrictMode's
 * simulated unmount/remount.
 */
export function usePageView() {
  const { pathname } = useLocation();
  const lastLoggedPath = useRef(null);

  useEffect(() => {
    if (lastLoggedPath.current === pathname) return;
    lastLoggedPath.current = pathname;
    // this *is* the analytics event; console is the spec'd sink
    console.log("[analytics] page_view", { path: pathname });
  }, [pathname]);
}
