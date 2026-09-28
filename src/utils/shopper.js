import { readStorage, writeStorage, STORAGE_KEYS } from "./storage.js";

/**
 * There is no login, so "one review per shopper" needs a stable identity for
 * this browser. Created once, kept in storage, and never shown to anyone.
 */
export function getShopperId() {
  const existing = readStorage(
    STORAGE_KEYS.shopperId,
    null,
    (v) => typeof v === "string" && v.length > 8
  );
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `shopper-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  writeStorage(STORAGE_KEYS.shopperId, id);
  return id;
}
