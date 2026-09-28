import { useEffect, useState } from "react";
import {
  getImage,
  isStoredImageRef,
  STORED_IMAGE_PREFIX,
} from "../services/imagesService.js";

/** Shown when a product has no image, or its image fails to load. */
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%25' height='100%25' fill='%23e7e7e9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%235b5d63' font-family='sans-serif' font-size='18'>Image unavailable</text></svg>";

/**
 * Turns a product's image field into something an <img> can show:
 * - plain paths pass straight through;
 * - "idb:<id>" (an image a store manager uploaded) is read from IndexedDB and
 *   exposed as an object URL, which is revoked on unmount or change so
 *   picking many images never leaks memory;
 * - missing values become the placeholder.
 *
 * @param {string | undefined} src
 * @returns {string}
 */
export function useProductImage(src) {
  const stored = isStoredImageRef(src);
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!stored) return undefined;
    let cancelled = false;
    let url = null;
    getImage(src.slice(STORED_IMAGE_PREFIX.length))
      .then((blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [src, stored]);

  if (!src) return PLACEHOLDER_IMAGE;
  if (stored) return objectUrl ?? PLACEHOLDER_IMAGE;
  return src;
}

/** onError handler that swaps a broken image for the placeholder, once. */
export function showPlaceholderOnError(event) {
  if (event.currentTarget.src !== PLACEHOLDER_IMAGE)
    event.currentTarget.src = PLACEHOLDER_IMAGE;
}
