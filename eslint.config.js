import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// React Hooks ESLint rules are never disabled anywhere in this project — see
// docs/specs.md §8 (non-functional requirements: "React Hooks ESLint rules
// are on and never disabled").
export default [
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Core no-unused-vars doesn't know a JSX tag like <Link> is a usage of
      // the `Link` import — this rule teaches it that, instead of every
      // component-using file needing an eslint-disable comment.
      "react/jsx-uses-vars": "error",
    },
  },
  {
    files: ["**/*.test.js", "src/test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },
  {
    files: ["*.config.js", "scripts/**/*.js", "scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright self-test: runs in Node, with callbacks evaluated in the browser.
    files: ["e2e/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
