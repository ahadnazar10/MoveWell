import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This project uses plain .js files (no .jsx) containing JSX — see docs/specs.md §2.
// Both settings below are needed: one for Vite's dev/build pipeline, one for
// esbuild's dependency pre-bundling step, which has its own loader map.
export default defineConfig({
  plugins: [react()],
  esbuild: { loader: "jsx", include: /src\/.*\.js$/, exclude: [] },
  optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    globals: true,
    // @phosphor-icons/react's entry imports ~4,500 small files. The browser
    // build bundles them, but Vitest would load each one separately, which
    // made the first test run after a change take minutes. Pre-bundle it.
    deps: {
      optimizer: {
        web: { enabled: true, include: ["@phosphor-icons/react"] },
      },
    },
  },
});
