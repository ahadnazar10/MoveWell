import { useEffect, useState } from "react";

export const MINIMUM_LOADER_MS = 1500;

const NOT_YET = Symbol("not yet");

/**
 * Module 1: the loading skeleton stays up for at least 1.5 s, even when the
 * data arrives sooner, so a fast response never flickers. Returns false
 * until the minimum has passed for the current `restartKey`; a new key
 * (a new query) starts the wait again. Shared by the home page and the
 * catalogue.
 *
 * @param {unknown} restartKey
 * @param {number} [ms]
 * @returns {boolean}
 */
export function useMinimumDelay(restartKey, ms = MINIMUM_LOADER_MS) {
  const [elapsedFor, setElapsedFor] = useState(NOT_YET);

  useEffect(() => {
    const timer = setTimeout(() => setElapsedFor(restartKey), ms);
    return () => clearTimeout(timer);
  }, [restartKey, ms]);

  return Object.is(elapsedFor, restartKey);
}
