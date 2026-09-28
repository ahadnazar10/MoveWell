import { useSyncExternalStore } from "react";

function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

const getSnapshot = () => navigator.onLine;

/**
 * True while the browser reports a connection. Shared by the offline banner
 * and checkout's Place order button, which previously would each have
 * needed their own online/offline listeners.
 *
 * @returns {boolean}
 */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
