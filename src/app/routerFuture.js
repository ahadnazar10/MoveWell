/**
 * React Router v7 future flags, opted into now so the console stays free of
 * "future flag" warnings (the brief wants a warning-free console). Shared by
 * the app router and the router used in integration tests.
 */
export const routerFuture = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
};

export const routerProviderFuture = { v7_startTransition: true };
