import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App } from "./App.js";
import { store } from "./app/store.js";
import { initCrossTabSync } from "./app/crossTabSync.js";
import { ThemeProvider } from "./context/ThemeContext.js";
import { LocationProvider } from "./context/LocationContext.js";
import { RoleProvider } from "./context/RoleContext.js";
import { routerFuture, routerProviderFuture } from "./app/routerFuture.js";
import "./fonts.css";
import "./index.css";

initCrossTabSync(store);

/**
 * A data router (createBrowserRouter) rather than <BrowserRouter>, only
 * because useBlocker — "unsaved changes, leave anyway?" on the admin form —
 * needs one. The route table itself stays as <Routes> inside App.
 */
const router = createBrowserRouter([{ path: "*", element: <App /> }], {
  future: routerFuture,
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <LocationProvider>
          <RoleProvider>
            <RouterProvider router={router} future={routerProviderFuture} />
          </RoleProvider>
        </LocationProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
