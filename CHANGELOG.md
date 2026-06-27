# Changelog

All notable changes are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/); this project follows [Semantic Versioning](https://semver.org/).

## [0.1.2] — 2026-06-27

### Changed
- Diagnostic message is now matcher-aware: `.to.be.ok` reports the chainable "is always truthy" and `.to.be.an('object')` reports it "is always an object", instead of a one-size-fits-all "always exists".

### Fixed
- Auto-fix now rewrites **only a standalone assertion statement**. When `expect(...)` is used as a value (e.g. `const r = expect(cy.get('.x')).to.exist`), the violation is reported but left unfixed, so the fix can no longer change what an expression evaluates to.

### Notes
- Cypress is **not** affected by the Playwright `await`-in-sync auto-fix bug fixed in its sibling plugin: `cy.get().should()` is a synchronous command-queue chain with no `await`, so there is no sync/async hazard here.

## [0.1.1] — 2026-06-27

### Changed
- README polish: title-case heading, real-world merged-PR evidence, package-manager install matrix (yarn/pnpm/bun), npx/bunx run, accurate false-positive wording. No rule behavior change.

## [0.1.0] — 2026-06-27

### Added
- `no-silent-pass` rule — flags chai assertions on an inline Cypress query that can never fail (`expect(cy.get('.x')).to.exist` / `.to.be.ok` / `.not.to.be.null` / `.not.to.be.undefined` / `.to.be.an('object')`).
- Auto-fix to `cy.get(...).should('be.visible')` for inline `cy`-query violations.
- `checkIdentifiers` option (opt-in heuristic for yielded jQuery identifiers; report-only).
- Flat config (`configs['flat/recommended']`) and legacy `configs.recommended`.
