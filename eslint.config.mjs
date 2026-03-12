import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      "dev/**",
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      ".vercel/**",
      "tsconfig.tsbuildinfo",
      "**/*.bak",
      "**/*.disabled",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
