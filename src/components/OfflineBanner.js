import { useOnlineStatus } from "../hooks/useOnlineStatus.js";

/** Shows a persistent banner while the browser reports itself offline. */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner no-print" role="status">
      You&apos;re offline. You can keep browsing; placing an order is paused until the
      connection returns.
    </div>
  );
}
