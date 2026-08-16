module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    // Static accessibility rules. Nothing stopped the a11y defects in #51
    // from being written or from coming back; these catch the mechanical
    // subset (missing alt, unlabelled controls, roles on the wrong element).
    "plugin:jsx-a11y/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["react-hooks", "react-refresh", "jsx-a11y"],
  // public/stockfish is vendored, minified Emscripten output (see
  // scripts/copy-stockfish.cjs), not project source.
  ignorePatterns: ["dist", "node_modules", "public/stockfish"],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
  },
};
