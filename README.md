# ESLint Plugin: Cypress Silent Pass

[![npm](https://img.shields.io/npm/v/eslint-plugin-cypress-silent-pass?style=flat-square&labelColor=black&color=1FC07C)](https://www.npmjs.com/package/eslint-plugin-cypress-silent-pass)
[![Cypress](https://img.shields.io/badge/Cypress-69D3A7?style=flat-square&labelColor=black&logo=cypress&logoColor=white)](https://cypress.io)
[![ESLint flat config](https://img.shields.io/badge/ESLint_9-flat_config-4B32C3?style=flat-square&labelColor=black&logo=eslint&logoColor=white)](https://eslint.org)
[![Auto-fixable](https://img.shields.io/badge/auto--fixable-1FC07C?style=flat-square&labelColor=black)](#fix)
[![Part of e2e-skills](https://img.shields.io/badge/part_of-e2e--skills-D97757?style=flat-square&labelColor=black)](https://github.com/voidmatcha/e2e-skills)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-37B0E6?style=flat-square&labelColor=black)](./LICENSE)

One ESLint rule for a blind spot that `eslint-plugin-cypress` does **not** cover: chai assertions on a Cypress query that **can never fail**.

```js
// ❌ always passes — cy.get() yields a chainable object that always exists
expect(cy.get('.badge')).to.exist;
expect(cy.get('.badge')).to.be.ok;
expect(cy.find('.row')).to.not.be.null;
expect(cy.contains('Save')).to.be.an('object');

// ✅ retrying assertion that actually checks the element
cy.get('.badge').should('be.visible');
```

`cy.get()` / `cy.find()` / `cy.contains()` don't return the element — they return a **Cypress chainable object**, which always exists, is always truthy, and is never null. So a chai `expect(cy.get(...)).to.exist` asserts nothing about the DOM; the test stays green whether the element is there or not.

## Why a new rule?

`eslint-plugin-cypress` ships no rule for this. `eslint-plugin-ui-testing` has `missing-assertion-in-test` (catches tests with **no** assertion) but not the **always-true** assertion above. This rule fills that gap and is designed to avoid false positives: it only fires when the `expect` subject is an inline `cy.*` query chain, so plain values and non-Cypress code are never touched.

The always-pass class isn't hypothetical — fixes for silent-pass E2E assertions have been reviewed and merged into real projects (see [e2e-skills · Proven in OSS](https://github.com/voidmatcha/e2e-skills#proven-in-open-source), 8 merged PRs). This rule catches the inline `cy`-query slice of that class automatically.

## Install

```bash
# npm
npm i -D eslint-plugin-cypress-silent-pass

# yarn
yarn add -D eslint-plugin-cypress-silent-pass

# pnpm
pnpm add -D eslint-plugin-cypress-silent-pass

# bun
bun add -d eslint-plugin-cypress-silent-pass
```

## Usage (flat config, ESLint 9+)

```js
// eslint.config.js
import silentPass from "eslint-plugin-cypress-silent-pass";

export default [
  silentPass.configs["flat/recommended"],
];
```

Or wire it yourself:

```js
import silentPass from "eslint-plugin-cypress-silent-pass";

export default [
  {
    plugins: { "cypress-silent-pass": silentPass },
    rules: { "cypress-silent-pass/no-silent-pass": "error" },
  },
];
```

### Legacy `.eslintrc`

```json
{
  "plugins": ["cypress-silent-pass"],
  "rules": { "cypress-silent-pass/no-silent-pass": "error" }
}
```

### Run

```bash
npx eslint .          # or: npx eslint --fix .
bunx eslint .         # or: bunx eslint --fix .
```

## Rule: `no-silent-pass`

Flags `expect(<inline cy query>)` followed by an always-true chai assertion:

| Assertion | Why it always passes on a chainable |
|---|---|
| `.to.exist` | the chainable object always exists |
| `.to.be.ok` | the chainable object is always truthy |
| `.to.not.be.null` | the chainable object is never null |
| `.to.not.be.undefined` | the chainable object is never undefined |
| `.to.be.an('object')` | the chainable is always an object |

A query is recognized as a `cy.*` chain containing one of: `get`, `find`, `contains`, `eq`, `first`, `last`, `filter`, `children`, `parent`, `parents`, `siblings`, `closest`, `next`, `prev`, `within`, `focused`, `root`.

**Auto-fixable.** `eslint --fix` rewrites inline `cy`-query violations to `cy.get(...).should('be.visible')`. The opt-in identifier heuristic is reported only, never auto-fixed.

### Options

```js
"cypress-silent-pass/no-silent-pass": ["error", { "checkIdentifiers": true }]
```

- `checkIdentifiers` (default `false`) — also flag `expect(<identifier>)` when the identifier looks like a yielded jQuery element (`$el`, `$row`, `userBadge`…), e.g. inside a `.then(($el) => { expect($el).to.exist })` callback. A heuristic; no autofix is offered for this case because the correct rewrite depends on context.

## Scope

Catches the **mechanical, inline** always-true case. Semantic silent-pass smells — a test that clicks Delete and never checks the row is gone, asserting the pre-state instead of the post-state — are not decidable by AST and are out of scope for any linter.

## Related

Part of a small family for catching tests that pass but prove nothing:

- **[eslint-plugin-playwright-silent-pass](https://github.com/voidmatcha/eslint-plugin-playwright-silent-pass)** — the same always-pass check for Playwright.
- **[e2e-skills](https://github.com/voidmatcha/e2e-skills)** — the full agent-skill catalog: 24 Playwright/Cypress anti-patterns, including the **semantic** silent-pass smells a linter can't decide (name↔assertion mismatch, missing post-state checks, missing auth setup, …).

This plugin is the mechanical, AST-decidable slice; `e2e-skills` covers the rest.

## License

Apache-2.0 © [voidmatcha](https://github.com/voidmatcha). See [LICENSE](./LICENSE).

