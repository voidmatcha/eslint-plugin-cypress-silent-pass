import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";
import rule from "../src/rules/no-silent-pass";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

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
    // polarity: these ALWAYS FAIL on a chainable, so must NOT be flagged
    "expect(cy.get('.x')).to.not.exist;",
    "expect(cy.get('.x')).to.be.null;",
    "expect(cy.get('.x')).to.not.be.ok;",
    // non-cy root not flagged (documented false negative)
    "expect(Cypress.$('.x')).to.exist;",
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
      // A: matcher-aware reason — `.to.be.ok` passes because the chainable is truthy
      code: "expect(cy.get('.x')).to.be.ok;",
      output: "cy.get('.x').should('be.visible');",
      errors: [
        { messageId: "silentPass", data: { chain: "to.be.ok", reason: "is always truthy" } },
      ],
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
    // jQuery identifier flagged only with the opt-in heuristic — report only, NOT fixed
    {
      code: "cy.get('.x').then(($el) => { expect($el).to.exist; });",
      options: [{ checkIdentifiers: true }],
      output: null,
      errors: [{ messageId: "silentPass" }],
    },
    // B-parallel: expect(...) as a VALUE — reported, NOT fixed (rewrite would change the value)
    {
      code: "const r = expect(cy.get('.x')).to.exist;",
      output: null,
      errors: [{ messageId: "silentPass" }],
    },
    // edge: awaited cy assertion — reported, never fixed (would await a chainable)
    {
      code: "async () => { await expect(cy.get('.x')).to.exist; };",
      output: null,
      errors: [{ messageId: "silentPass" }],
    },
    // edge: return position — reported, not fixed
    {
      code: "function f() { return expect(cy.get('.x')).to.exist; }",
      output: null,
      errors: [{ messageId: "silentPass" }],
    },
    // comment between expect() and the chai chain — reported, but NOT fixed
    // (the rewrite would drop the comment).
    {
      code: "expect(cy.get('.x')) /* keep */ .to.exist;",
      output: null,
      errors: [{ messageId: "silentPass" }],
    },
  ],
});
