/**
 * IndexedDB-backed storage for admin-uploaded product images — see
 * docs/specs.md §4.4 (why IndexedDB, not localStorage). The full picker +
 * preview UI is built in Module 8; this file is just the storage primitive
 * it calls, so it exists from Foundation onward like every other service.
 *
 * Not wrapped in simulate() — it's local device storage, not a stand-in for
 * a remote call, and isn't in the brief's data-service table.
 */
const DB_NAME = "fitarena-images";
const STORE_NAME = "images";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @param {Blob} blob @returns {Promise<string>} an id to store on the product record */
export async function saveImage(blob) {
  const db = await openDb();
  const id = `img-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

/** @returns {Promise<Blob | null>} */
export async function getImage(id) {
  const db = await openDb();
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

export async function deleteImage(id) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Developer-controls "reset all stored data" — removes every uploaded image. */
export async function clearAllImages() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Products store an uploaded image as "idb:<id>" rather than a blob: URL,
 * because blob: URLs die with the page. useProductImage() resolves the
 * reference back to a displayable URL.
 */
export const STORED_IMAGE_PREFIX = "idb:";

export function isStoredImageRef(src) {
  return typeof src === "string" && src.startsWith(STORED_IMAGE_PREFIX);
}
