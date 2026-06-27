"use strict";

/**
 * Flags chai assertions on a Cypress query that can never fail, because
 * cy.get()/cy.find()/cy.contains() yield a Chainable OBJECT (not the element),
 * and that object always exists / is truthy / is never null:
 *
 *   expect(cy.get('.badge')).to.exist          // always passes
 *   expect(cy.get('.badge')).to.be.ok          // always passes
 *   expect(cy.find('.row')).to.not.be.null     // always passes
 *   expect(cy.contains('Save')).to.be.an('object') // always passes
 *
 * The intent is to assert element state. The fix is a Cypress retrying
 * assertion:  cy.get('.badge').should('be.visible')
 *
 * Detection is syntactic: the expect() argument must be an inline cy query.
 */

const CY_QUERY_COMMANDS = new Set([
  "get",
  "find",
  "contains",
  "eq",
  "first",
  "last",
  "filter",
  "children",
  "parent",
  "parents",
  "siblings",
  "closest",
  "next",
  "nextAll",
  "prev",
  "prevAll",
  "within",
  "focused",
  "root",
]);

const JQUERY_NAME_HINT = /^\$|(?:element|elem|el|els|node|row|cell|badge|button|input|field)s?$/i;

function chainMethodNames(node) {
  const names = [];
  let cur = node;
  while (cur) {
    if (cur.type === "CallExpression") cur = cur.callee;
    else if (cur.type === "MemberExpression") {
      if (cur.property && !cur.computed && cur.property.name) names.push(cur.property.name);
      cur = cur.object;
    } else break;
  }
  return { names, root: cur };
}

function isCyQuery(arg) {
  if (!arg || arg.type !== "CallExpression") return false;
  const { names, root } = chainMethodNames(arg);
  if (!(root && root.type === "Identifier" && root.name === "cy")) return false;
  return names.some((n) => CY_QUERY_COMMANDS.has(n));
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow chai assertions on a Cypress query that can never fail (always-pass / silent-pass).",
      recommended: true,
      url: "https://github.com/voidmatcha/eslint-plugin-cypress-silent-pass/blob/main/docs/rules/no-silent-pass.md",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: { checkIdentifiers: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
    messages: {
      silentPass:
        "`expect(query).{{ chain }}` always passes — `cy.get()` yields a chainable object that always exists. This assertion can never fail. Assert element state with `.should()` (e.g. `cy.get(...).should('be.visible')`).",
    },
  },

  create(context) {
    const checkIdentifiers = context.options[0] && context.options[0].checkIdentifiers;
    const sourceCode = context.sourceCode || context.getSourceCode();

    function isSubject(arg) {
      if (isCyQuery(arg)) return true;
      if (checkIdentifiers && arg && arg.type === "Identifier") return JQUERY_NAME_HINT.test(arg.name);
      return false;
    }

    return {
      CallExpression(node) {
        if (!(node.callee.type === "Identifier" && node.callee.name === "expect")) return;
        if (node.arguments.length !== 1) return;
        const arg = node.arguments[0];
        if (!isSubject(arg)) return;

        // walk UP the chai chain collecting property names
        const props = [];
        let callArgs = null;
        let cur = node;
        let top = node;
        let p = node.parent;
        while (p) {
          if (p.type === "MemberExpression" && p.object === cur) {
            if (p.property && !p.computed && p.property.name) props.push(p.property.name);
            cur = p;
            top = p;
            p = p.parent;
            if (p && p.type === "CallExpression" && p.callee === cur) {
              if (p.arguments.length) callArgs = p.arguments;
              cur = p;
              top = p;
              p = p.parent;
            }
          } else break;
        }
        if (props.length === 0) return;

        const negated = props.includes("not");
        const terminal = props[props.length - 1];
        let always = false;
        if (!negated && (terminal === "exist" || terminal === "ok")) always = true;
        else if (negated && (terminal === "null" || terminal === "undefined")) always = true;
        else if (
          !negated &&
          (terminal === "a" || terminal === "an") &&
          callArgs &&
          callArgs[0] &&
          callArgs[0].type === "Literal" &&
          /object/i.test(String(callArgs[0].value))
        )
          always = true;
        if (!always) return;

        const chainText = props.join(".") + (callArgs ? "(...)" : "");
        context.report({
          node: top,
          messageId: "silentPass",
          data: { chain: chainText },
          // Autofix only the high-confidence inline cy-query case. Heuristic
          // identifier matches ($el inside .then) are report-only.
          fix(fixer) {
            if (!isCyQuery(arg)) return null;
            return fixer.replaceText(top, `${sourceCode.getText(arg)}.should('be.visible')`);
          },
        });
      },
    };
  },
};
