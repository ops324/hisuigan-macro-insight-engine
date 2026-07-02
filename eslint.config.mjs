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
  {
    rules: {
      // App Router では layout.tsx の <head> でフォントを読み込むのが正
      // （このルールは Pages Router の _document 前提の誤検知）
      "@next/next/no-page-custom-font": "off",
    },
  },
]);

export default eslintConfig;
