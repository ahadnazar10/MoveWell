/**
 * Delay/failure config + call log for the data service, plus the "reset to
 * original data" control. Deliberately a plain module singleton, NOT a Redux
 * slice — see docs/specs.md §10c. simulate.js (every service function) reads
 * this directly with no import of the Redux store, which keeps src/services/
 * framework-agnostic. The DevControls panel subscribes to it with
 * useSyncExternalStore, the same hook already used for the offline banner
 * and ThemeContext's System mode.
 */
const MAX_LOG_ENTRIES = 100;

function envNumber(key, fallback) {
  const raw = import.meta.env[key];
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const defaults = {
  delayMin: envNumber("VITE_SERVICE_DELAY_MIN", 300),
  delayMax: envNumber("VITE_SERVICE_DELAY_MAX", 800),
  failureRate: envNumber("VITE_SERVICE_FAILURE_RATE", 0),
  // Level-up L2: search calls get their own random 0..searchDelayMax delay.
  searchDelayMax: 2000,
};

let state = { ...defaults, log: [] };
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

export const devConfig = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot() {
    return state;
  },

  setDelay(delayMin, delayMax) {
    state = { ...state, delayMin, delayMax };
    notify();
  },

  setSearchDelayMax(searchDelayMax) {
    state = { ...state, searchDelayMax };
    notify();
  },

  setFailureRate(failureRate) {
    state = { ...state, failureRate };
    notify();
  },

  /** Called by simulate.js after every service call, success or failure. */
  logCall(entry) {
    const log = [{ ...entry, at: Date.now() }, ...state.log].slice(0, MAX_LOG_ENTRIES);
    state = { ...state, log };
    notify();
  },

  clearLog() {
    state = { ...state, log: [] };
    notify();
  },

  /** Restores delay/failure defaults from env — does NOT touch stored product/cart/etc. data. */
  resetToDefaults() {
    state = { ...defaults, log: [] };
    notify();
  },
};
