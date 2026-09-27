import js from "@eslint/js";
import playwright from "eslint-plugin-playwright";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["playwright-report/", "test-results/", "pacts/", "playwright/", "migration-snapshots/"] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["eslint.config.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["tests/**/*.ts"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      // Page objects and API helpers assert through methods named expect*, e.g. expectLoaded().
      "playwright/expect-expect": ["warn", { assertFunctionPatterns: ["^expect[A-Z]"] }],
      "playwright/no-skipped-test": ["warn", { allowConditional: true }],
    },
  },
);
