import noSilentPass from "./rules/no-silent-pass";

const { name, version } = require("../package.json") as {
  name: string;
  version: string;
};

const plugin = {
  meta: { name, version },
  rules: {
    "no-silent-pass": noSilentPass,
  },
  configs: {} as Record<string, unknown>,
};

// Flat config (ESLint 9+) + legacy `.eslintrc`.
plugin.configs = {
  "flat/recommended": {
    plugins: { "cypress-silent-pass": plugin },
    rules: {
      "cypress-silent-pass/no-silent-pass": "error",
    },
  },
  recommended: {
    plugins: ["cypress-silent-pass"],
    rules: {
      "cypress-silent-pass/no-silent-pass": "error",
    },
  },
};

export = plugin;
