import { readStorage, writeStorage, STORAGE_KEYS, validators } from "../utils/storage.js";
import { simulate, ServiceError } from "./simulate.js";

/**
 * Addresses saved by an earlier version used { fullName, street, zipCode, state };
 * they are read in the current { name, address, pin } shape so nothing a
 * shopper saved is lost.
 */
function normalize(a) {
  return {
    id: a.id,
    name: a.name ?? a.fullName ?? "",
    email: a.email ?? "",
    phone: a.phone ?? "",
    address: a.address ?? [a.street, a.state].filter(Boolean).join(", "),
    city: a.city ?? "",
    pin: a.pin ?? a.zipCode ?? "",
  };
}

function loadAddresses() {
  return readStorage(STORAGE_KEYS.addresses, [], validators.array)
    .filter((a) => a && typeof a === "object" && typeof a.id === "string")
    .map(normalize);
}
function saveAddresses(list) {
  writeStorage(STORAGE_KEYS.addresses, list);
}

export function getAddresses() {
  return simulate("getAddresses", {}, () => loadAddresses());
}

export function createAddress(data) {
  return simulate("createAddress", { data }, () => {
    const list = loadAddresses();
    const id = `addr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const saved = { ...data, id };
    saveAddresses([...list, saved]);
    return saved;
  });
}

export function updateAddress(id, data) {
  return simulate("updateAddress", { id, data }, () => {
    const list = loadAddresses();
    if (!list.some((a) => a.id === id))
      throw new ServiceError(404, `Address ${id} not found`);
    const updated = list.map((a) => (a.id === id ? { ...a, ...data, id } : a));
    saveAddresses(updated);
    return updated.find((a) => a.id === id);
  });
}

export function deleteAddress(id) {
  return simulate("deleteAddress", { id }, () => {
    const list = loadAddresses();
    if (!list.some((a) => a.id === id))
      throw new ServiceError(404, `Address ${id} not found`);
    saveAddresses(list.filter((a) => a.id !== id));
    return { id };
  });
}
