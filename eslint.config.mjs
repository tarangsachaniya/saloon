// Next.js 16's eslint-config-next ships flat-config-native exports, so the
// `FlatCompat` legacy-config bridge (still shown in some older docs/scaffolds)
// is unnecessary here and was actually incompatible with this version pairing
// (ESLint 9.39 + eslint-config-next 16), throwing a circular-JSON error at
// config load before any file was linted.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
];

export default eslintConfig;
