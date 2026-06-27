import { AST_NODE_TYPES, ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/voidmatcha/eslint-plugin-cypress-silent-pass/blob/main/docs/rules/${name}.md`,
);

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

const JQUERY_NAME_HINT =
  /^\$|(?:element|elem|el|els|node|row|cell|badge|button|input|field)s?$/i;

/** Property names along a chain plus the root (non-member/non-call) node. */
function chainRoot(node: TSESTree.Node): {
  names: string[];
  root: TSESTree.Node | undefined;
} {
  const names: string[] = [];
  let cur: TSESTree.Node | undefined = node;
  while (cur) {
    if (cur.type === AST_NODE_TYPES.CallExpression) {
      cur = cur.callee;
    } else if (cur.type === AST_NODE_TYPES.MemberExpression) {
      if (!cur.computed && cur.property.type === AST_NODE_TYPES.Identifier) {
        names.push(cur.property.name);
      }
      cur = cur.object;
    } else {
      break;
    }
  }
  return { names, root: cur };
}

/** An inline `cy.*` query chain anchored by the `cy` identifier. */
function isCyQuery(arg: TSESTree.Node): boolean {
  if (arg.type !== AST_NODE_TYPES.CallExpression) return false;
  const { names, root } = chainRoot(arg);
  if (!(root?.type === AST_NODE_TYPES.Identifier && root.name === "cy")) {
    return false;
  }
  return names.some((n) => CY_QUERY_COMMANDS.has(n));
}

export type Options = [{ checkIdentifiers?: boolean }];
export type MessageIds = "silentPass";

export default createRule<Options, MessageIds>({
  name: "no-silent-pass",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow chai assertions on a Cypress query that can never fail (always-pass / silent-pass).",
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
        "`expect(query).{{ chain }}` always passes — a `cy.get()` chainable {{ reason }}. This assertion can never fail. Assert element state with `.should()` (e.g. `cy.get(...).should('be.visible')`).",
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const checkIdentifiers = options?.checkIdentifiers ?? false;
    const sourceCode = context.sourceCode;

    function isSubject(arg: TSESTree.Node): boolean {
      if (isCyQuery(arg)) return true;
      if (checkIdentifiers && arg.type === AST_NODE_TYPES.Identifier) {
        return JQUERY_NAME_HINT.test(arg.name);
      }
      return false;
    }

    return {
      CallExpression(node): void {
        if (
          node.callee.type !== AST_NODE_TYPES.Identifier ||
          node.callee.name !== "expect"
        ) {
          return;
        }
        if (node.arguments.length !== 1) return;
        const arg = node.arguments[0];
        if (arg.type === AST_NODE_TYPES.SpreadElement || !isSubject(arg)) return;

        // Walk UP the chai chain collecting property names.
        const props: string[] = [];
        let callArgs: TSESTree.CallExpressionArgument[] | null = null;
        let cur: TSESTree.Node = node;
        let top: TSESTree.Node = node;
        let p: TSESTree.Node | undefined = node.parent;
        while (p) {
          if (p.type === AST_NODE_TYPES.MemberExpression && p.object === cur) {
            if (!p.computed && p.property.type === AST_NODE_TYPES.Identifier) {
              props.push(p.property.name);
            }
            cur = p;
            top = p;
            p = p.parent;
            if (p && p.type === AST_NODE_TYPES.CallExpression && p.callee === cur) {
              if (p.arguments.length) callArgs = p.arguments;
              cur = p;
              top = p;
              p = p.parent;
            }
          } else {
            break;
          }
        }
        if (props.length === 0) return;

        const negated = props.includes("not");
        const terminal = props[props.length - 1];
        const firstArg = callArgs?.[0];
        let always = false;
        if (!negated && (terminal === "exist" || terminal === "ok")) {
          always = true;
        } else if (negated && (terminal === "null" || terminal === "undefined")) {
          always = true;
        } else if (
          !negated &&
          (terminal === "a" || terminal === "an") &&
          firstArg?.type === AST_NODE_TYPES.Literal &&
          /object/i.test(String(firstArg.value))
        ) {
          always = true;
        }
        if (!always) return;

        const chainText = props.join(".") + (callArgs ? "(...)" : "");
        let reason = "always exists";
        if (!negated && terminal === "ok") reason = "is always truthy";
        else if (!negated && (terminal === "a" || terminal === "an")) {
          reason = "is always an object";
        } else if (negated && terminal === "null") reason = "is never null";
        else if (negated && terminal === "undefined") reason = "is never undefined";

        const subjectText = sourceCode.getText(arg);
        const fixTop = top;

        context.report({
          node: top,
          messageId: "silentPass",
          data: { chain: chainText, reason },
          fix(fixer) {
            // Auto-fix only the safe case; each guard below bails to report-only.
            // - subject must be an inline cy.* query
            // - the assertion must be a standalone statement (rewriting a value-position expect changes what it evaluates to)
            // - no comment between expect(...) and the chai chain (the rewrite would drop it)
            if (!isCyQuery(arg)) return null;
            if (fixTop.parent?.type !== AST_NODE_TYPES.ExpressionStatement) {
              return null;
            }
            if (
              sourceCode.getCommentsInside(fixTop).length >
              sourceCode.getCommentsInside(arg).length
            ) {
              return null;
            }
            return fixer.replaceText(
              fixTop,
              `${subjectText}.should('be.visible')`,
            );
          },
        });
      },
    };
  },
});
