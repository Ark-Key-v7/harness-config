---
manifold_version: "TEMPLATE_VALUE_REQUIRED — semver; bump on any law change, e.g. 1.0.0"
last_verified: "TEMPLATE_VALUE_REQUIRED — SHA of the commit that last modified this file. NEVER a date."
precedence: 1
---

# RULES.MD — THE NEGATIVE PROTOCOL

Precedence rank 1 of 5 (supreme law). Conflicts resolve per manifold precedence and halt law.
Any cross-file contradiction halts the Task Contract and escalates; no agent-side resolution.

## ZONE A — THE LAW (fixed, invariant — never edit per project)

### A.1 Constitutional layer (TMD Specification v2.1, §0)

**The Precedence Law (§0.1).** The manifold is a total order, not a committee:
rules.md (1, safety) > gravity.md (2, structural) > promises.md (3, behavioral) >
glossary.md (4, vocabulary) > design.md (5, presentation).
A forbidden-state law outranks a module-boundary law that would permit it. A
structural boundary outranks a timeout budget that assumes the boundary is
permeable. A temporal budget outranks vocabulary. Vocabulary outranks
presentation. No agent interpretation — precedence is arithmetic.

**The Conflict Halt (§0.2).** On any cross-file contradiction: HALT the active
Task Contract immediately (no agent-side resolution); ESCALATE by emitting a
MANIFOLD_CONFLICT event to the execution ledger naming both files, both
clauses, and the triggering Task Contract; RESUME only when a human-authored
PR resolving the conflict merges and the affected files' last_verified headers
advance — the resumed task re-reads the manifold from the new HEAD, never from
cached context. One halt instrument, two triggers (execution-detected direct
conflict; vector-detected near-duplicate via semantic dedup, threshold 0.95).

**The Manifest Header (§0.3).** The YAML header above is mandatory:
manifold_version (semver), last_verified (commit SHA), precedence (rank). A
file without a valid header is invalid law; an agent encountering one halts
per §0.2. The header enables three mechanical checks: drift detection,
halt-resolution verification, staleness rejection.

**Monorepo Inheritance (§0.4).** Exactly one manifold per repository, at root;
all packages inherit it totally. Package-local specificity ONLY as applies_to:
scopes here or named sub-graphs in gravity.md's Registry. Package-local
manifold files, package-local instruction files, and duplicated root law are
forbidden — duplication is drift; drift is slop.

**The Instruction-File Boundary (§0.5).** No conversational/persona-bearing
instruction files anywhere in the product tree. No distributed instruction
files below root. Exactly one root AGENTS.md, ≤50 lines, zero constraint text.

**The Enforcement Registry (§0.6).** Every law names its wall. A law without a
named mechanical gate is a suggestion, and suggestions are not law. Gates are
named by instrument CLASS (type-checker, ast-audit, linter, secret-scanner,
test-runner, visual-regression, adversarial-review, pretool-hook); the Stack
Manifest in gravity.md binds classes to concrete tools. A law that cannot yet
be mechanically gated is marked enforcement: manual-review and routes to the
human gate — never silently unenforced.

### A.2 The ten global negative constraints (canon, fixed)

You are mathematically forbidden from generating the following anti-patterns.
Violation results in immediate PR rejection. Each law may carry an optional
applies_to: path scope (Zone C); an unscoped law binds the entire repository.

1. **NO NULLABLE SHORTCUTS:** NEVER use nullable/optional fields for mandatory domain transitions. Enforce structural invariants.
2. **NO SWALLOWED ERRORS:** NEVER use generic `console.error(e)` or naked `try/catch` blocks. Errors must be topologically routed or escalated.
3. **NO NARRATIVE COMMENTS:** NEVER write comments explaining *what* the code does. Only comment *why* local symmetry was violated.
4. **NO UPSTREAM LEAKS:** NEVER allow infrastructure imports (transport status codes, persistence decorators, framework annotations) to leak into core domain models. Imports flow one way.
5. **NO POLYAMOROUS STATE:** NEVER allow multiple lifecycle owners for a single mutable variable. State mutations must occur inside explicit transaction boundaries.
6. **NO MIXED ABSTRACTIONS:** NEVER mix macro-orchestration and micro-syntax (raw regex, raw query strings) in the same function. Maintain an even abstraction ladder.
7. **NO HAPPY-PATH ASSUMPTIONS:** NEVER write network/database calls without explicit timeouts, retry budgets, or circuit breakers.
8. **NO BRITTLE MOCKS:** NEVER write unit tests that heavily mock the persistence layer just to verify a call count. Tests must assert black-box invariants across module boundaries.
9. **NO IMPLICIT LIFETIMES:** NEVER leave connections open. Resource disposal must be deterministic and structurally visible.
10. **NO SPECULATIVE BOILERPLATE:** NEVER write abstract classes with only one implementation. NEVER write speculative plugin architectures for features that do not exist. Delete unused code.

### A.3 Stage-4 review marks (human gate reference)

The Level-6 review rubric — the Ten Diagnostic Marks — is defined once, in the
handbook (Part V). It is referenced, not duplicated, here. The Stage-4
reviewer evaluates the PR against the Ten Marks; the autonomous worker obeys
§A.2. The two matrices share roots but have different readers. Do not paste
the Marks into this file; duplication is drift.

### A.4 Enforcement (instrument classes; concrete bindings live in gravity.md's gates)

- Laws 1, 4, 5, 10: type-checker + linter structural rules + ast-audit (Stage 1).
- Laws 2, 3, 6, 9: linter custom rules (the project's negative-protocol ruleset) at Stage 0 and Stage 2.
- Laws 7, 8: promises.md test-determinism gates + test-runner (Stage 1).
- Any law without a passing mechanical gate on a given PR routes to adversarial-review (Stage 2) and the Level-6 gate (Stage 4). PR rejection is the consequence instrument for all ten laws.

## ZONE B — THE STRUCTURE (fixed skeleton)

Canonical section order for this file: (1) Zone A law (above — fixed);
(2) Scoped laws (Zone C — the ONLY project-specific content); (3) Enforcement
(Zone A.4 — fixed). A correct scoped-law entry is: a reference to a Zone A.2
law by name, plus an applies_to: path scope that resolves against gravity.md's
Sub-Graph Registry or a real repo path. A scoped law that names no valid path
is invalid. New GLOBAL bans are a manifold amendment (see the Amendment
Protocol below), not a Zone C edit.

## ZONE C — FILLABLE SLOTS (project-specific)

### Scoped laws
<!-- TEMPLATE_VALUE_REQUIRED — YAML block. Bind the Zone A.2 laws to this
     project's paths (from the Stack Manifest layers in gravity.md).
     Micro-example of a completed block:
```yaml
scoped_laws:
  - law: NO_UPSTREAM_LEAKS
    applies_to: src/lib/domain/**
  - law: NO_HAPPY_PATH_ASSUMPTIONS
    applies_to: convex/**
  - law: NO_BRITTLE_MOCKS
    applies_to: tests/**
```
-->
TEMPLATE_VALUE_REQUIRED

---

**Manifold Amendment Protocol.** Every change to any manifold file follows
GitOps law: PR only, never direct edits on main; the empirical reason
documented in the PR body; manifold_version bumped; last_verified advanced on
merge; the retrieval index over .tmd/ refreshed by the merge hook. A manifold
PR that fails to advance the headers is invalid and is rejected by CI.
