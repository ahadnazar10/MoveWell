import "@testing-library/jest-dom/vitest";

// Node 22+ ships an experimental global `localStorage` that is `undefined`
// unless Node runs with --localstorage-file. It shadows jsdom's working
// Storage, so every test touching storage failed on newer Node versions.
// Point both globals back at jsdom's own implementation.
for (const name of ["localStorage", "sessionStorage"]) {
  if (typeof globalThis[name] === "undefined" && globalThis.jsdom) {
    const storage = globalThis.jsdom.window[name];
    Object.defineProperty(globalThis, name, {
      value: storage,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, name, {
      value: storage,
      configurable: true,
      writable: true,
    });
  }
}

// jsdom has no matchMedia; ThemeContext and the hero's reduced-motion check use it.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// React Router's data router creates fetch Requests with an AbortSignal on
// every navigation. Under jsdom, AbortSignal comes from jsdom but Request from
// Node, and Node rejects the foreign signal. Tests don't need to abort
// navigations, so drop the signal. (Browsers are unaffected.)
if (typeof Request !== "undefined") {
  const NodeRequest = Request;
  globalThis.Request = class TestRequest extends NodeRequest {
    constructor(input, init) {
      const options = init ? { ...init } : init;
      if (options) delete options.signal;
      super(input, options);
    }
  };
}
