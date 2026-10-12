import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
export default [
  {
    ignores: [
      ".next/**",
      ".next-*/**",
      "next-env.d.ts",
      "generated/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "error" },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
