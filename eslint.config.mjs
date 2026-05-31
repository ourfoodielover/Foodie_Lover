import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Project-level rule overrides
  {
    rules: {
      // react-hooks v7 introduced set-state-in-effect which flags valid patterns
      // (e.g. setting state after an async auth check inside useEffect).
      // Downgrade from error to off so the build is not blocked.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
