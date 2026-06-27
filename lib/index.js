"use strict";

const noSilentPass = require("./rules/no-silent-pass");
const pkg = require("../package.json");

const plugin = {
  meta: { name: pkg.name, version: pkg.version },
  rules: {
    "no-silent-pass": noSilentPass,
  },
};

// Config naming mirrors eslint-plugin-playwright: `flat/recommended` (flat) +
// `recommended` (legacy .eslintrc).
plugin.configs = {
  "flat/recommended": {
    plugins: { "cypress-silent-pass": plugin },
    rules: { "cypress-silent-pass/no-silent-pass": "error" },
  },
  recommended: {
    plugins: ["cypress-silent-pass"],
    rules: { "cypress-silent-pass/no-silent-pass": "error" },
  },
};

module.exports = plugin;
