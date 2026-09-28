import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Asks before leaving a form with unsaved changes — both in-app navigation
 * (React Router's useBlocker, so the app's own dialog is shown) and closing
 * or reloading the tab (the browser's native beforeunload prompt, the only
 * thing browsers allow there).
 *
 * `when` is mirrored into a ref so `allowNavigation()` can switch the guard
 * off synchronously — e.g. right after a successful save, before navigating
 * away in the same event handler, when the new `when=false` has not
 * rendered yet.
 *
 * @param {boolean} when  true while there are unsaved changes
 * @returns {{ isBlocked: boolean, stay: () => void, leave: () => void, allowNavigation: () => void }}
 */
export function useUnsavedChangesPrompt(when) {
  const whenRef = useRef(when);
  useEffect(() => {
    whenRef.current = when;
  }, [when]);

  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }) =>
      whenRef.current &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
    []
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!when) return undefined;
    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [when]);

  return {
    isBlocked: blocker.state === "blocked",
    stay: () => blocker.reset?.(),
    leave: () => blocker.proceed?.(),
    allowNavigation: () => {
      whenRef.current = false;
    },
  };
}
