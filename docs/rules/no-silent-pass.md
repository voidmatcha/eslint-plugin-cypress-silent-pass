# Disallow chai assertions on a Cypress query that can never fail (`no-silent-pass`)

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/use/command-line-interface#--fix).

`cy.get()` / `cy.find()` / `cy.contains()` do not return the element — they
return a Cypress **chainable object**, which always exists, is always truthy, and
is never null. So a chai assertion applied directly to that object asserts
nothing about the DOM and **can never fail**.

## Rule details

This rule flags `expect(<cy query>)` followed by an always-true chai assertion:

| Assertion | Why it always passes |
| --- | --- |
| `.to.exist` | the chainable object always exists |
| `.to.be.ok` | the chainable object is always truthy |
| `.to.not.be.null` | the chainable object is never null |
| `.to.not.be.undefined` | the chainable object is never undefined |
| `.to.be.an('object')` | the chainable is always an object |

A query is recognized as a `cy.*` chain containing one of `get`, `find`,
`contains`, `eq`, `first`, `last`, `filter`, `children`, `parent`, `parents`,
`siblings`, `closest`, `next`, `prev`, `within`, `focused`, `root`.

The following patterns are warnings:

```js
expect(cy.get('.user-badge')).to.exist;
expect(cy.get('.x')).to.be.ok;
expect(cy.find('.row')).to.not.be.null;
expect(cy.contains('Save')).to.be.an('object');
```

The following patterns are not warnings:

```js
cy.get('.user-badge').should('be.visible');
cy.get('.x').should('exist');
expect(response.status).to.eq(200);     // real value
expect(cy.get('.x')).to.have.length(3); // meaningful assertion
```

## Fix

The autofix rewrites inline `cy`-query violations to a retrying `.should()`:

```diff
- expect(cy.get('.user-badge')).to.exist;
+ cy.get('.user-badge').should('be.visible');
```

## Options

```jsonc
{
  "cypress-silent-pass/no-silent-pass": ["error", { "checkIdentifiers": true }]
}
```

- `checkIdentifiers` (default `false`) — also flag `expect(<identifier>)` when the
  identifier looks like a yielded jQuery element (`$el`, `$row`…), e.g. inside a
  `.then(($el) => { expect($el).to.exist })` callback. Reported only, never
  auto-fixed.
