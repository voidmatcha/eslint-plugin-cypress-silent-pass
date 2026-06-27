"use strict";

const { RuleTester } = require("eslint");
const rule = require("../lib/rules/no-silent-pass");

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

ruleTester.run("no-silent-pass", rule, {
  valid: [
    // correct Cypress retrying assertions
    "cy.get('.badge').should('be.visible');",
    "cy.get('.badge').should('exist');",
    "cy.find('.row').should('have.length', 3);",
    // real chai assertions on real values
    "expect(response.status).to.eq(200);",
    "expect(value).to.exist;",
    "expect(user).to.not.be.null;",
    // cy query but a meaningful (non-always-true) assertion
    "expect(cy.get('.x').its('length')).to.be.greaterThan(0);",
    "expect(cy.get('.x')).to.have.length(3);",
    // jQuery identifier not flagged by default
    "cy.get('.x').then(($el) => { expect($el).to.exist; });",
  ],
  invalid: [
    {
      code: "expect(cy.get('.user-badge')).to.exist;",
      output: "cy.get('.user-badge').should('be.visible');",
      errors: [{ messageId: "silentPass" }],
    },
    {
      // A: matcher-aware reason — `.to.be.ok` passes because the chainable is truthy,
      // not because it "exists".
      code: "expect(cy.get('.x')).to.be.ok;",
      output: "cy.get('.x').should('be.visible');",
      errors: [{ messageId: "silentPass", data: { chain: "to.be.ok", reason: "is always truthy" } }],
    },
    {
      code: "expect(cy.find('.row')).to.not.be.null;",
      output: "cy.find('.row').should('be.visible');",
      errors: [{ messageId: "silentPass" }],
    },
    {
      code: "expect(cy.contains('Save')).to.be.an('object');",
      output: "cy.contains('Save').should('be.visible');",
      errors: [{ messageId: "silentPass" }],
    },
    // jQuery identifier flagged only with the opt-in heuristic — report only, NOT autofixed
    {
      code: "cy.get('.x').then(($el) => { expect($el).to.exist; });",
      options: [{ checkIdentifiers: true }],
      output: null,
      errors: [{ messageId: "silentPass" }],
    },
    // B-parallel: expect(...) used as a VALUE — still reported, but NOT auto-fixed,
    // because rewriting to `cy.get(...).should(...)` would change what the
    // expression evaluates to. Standalone assertion statements are still fixed.
    {
      code: "const r = expect(cy.get('.x')).to.exist;",
      output: null,
      errors: [{ messageId: "silentPass" }],
    },
    // edge: awaited cy assertion (unusual) — reported, never auto-fixed (rewriting
    // would await a Cypress chainable). Parent is AwaitExpression, not a statement.
    {
      code: "async () => { await expect(cy.get('.x')).to.exist; };",
      output: null,
      errors: [{ messageId: "silentPass" }],
    },
    // edge: return position — reported, not fixed (rewrite would change the returned value)
    {
      code: "function f() { return expect(cy.get('.x')).to.exist; }",
      output: null,
      errors: [{ messageId: "silentPass" }],
    },
  ],
});

console.log("no-silent-pass (cypress): all assertions passed");
