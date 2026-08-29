---
manifold_version: "TEMPLATE_VALUE_REQUIRED — semver; bump on any law change, e.g. 1.0.0"
last_verified: "TEMPLATE_VALUE_REQUIRED — SHA of the commit that last modified this file. NEVER a date."
precedence: 4
---

# GLOSSARY.MD — THE SEMANTIC SCHEMA

Precedence rank 4 of 5. Subordinate to rules.md, gravity.md, promises.md.
Locks the ubiquitous language — domain entities and system identifiers alike.
One canonical spelling per name; forbidden variants are rejected mechanically.

## ZONE A — THE LAW (fixed, invariant — never edit per project)

### A.1 Constitutional layer (TMD Specification v2.1, §0)

**The Precedence Law (§0.1).** rules.md (1) > gravity.md (2) > promises.md (3)
> glossary.md (4) > design.md (5). Higher precedence wins automatically; no
agent interpretation.

**The Conflict Halt (§0.2).** On any cross-file contradiction: HALT the Task
Contract; ESCALATE via MANIFOLD_CONFLICT event naming both files, both
clauses, and the triggering contract; RESUME only after a human-authored PR
merges and last_verified headers advance — re-read from the new HEAD.

**The Manifest Header (§0.3).** manifold_version (semver), last_verified
(commit SHA), precedence (rank). No valid header = invalid law; halt per §0.2.

**Monorepo Inheritance (§0.4).** One manifold per repository, at root; total
inheritance. Package-local manifold files and duplicated root law forbidden.

**The Instruction-File Boundary (§0.5).** One root AGENTS.md, ≤50 lines, zero
constraint text. Harness markdown lives exclusively in /.agents/.

**The Enforcement Registry (§0.6).** Every law names its wall (instrument
class; concrete tools bound in gravity.md's gates). Ungateable law is marked
enforcement: manual-review — never silently unenforced.

### A.2 Ubiquitous language law (fixed)

Do not invent synonyms. Use the exact entity names declared in Zone C across
persistence, backend, and frontend. Every normative term used in precedence
1–3 files MUST be defined here exactly once. Definitions MUST be operational:
a reader must be able to decide whether a given thing IS or IS NOT an instance
of the term. One term = one definition; alias lines point at the canonical
term; synonym sprawl is prohibited.

### A.3 System identifier law (fixed)

One canonical spelling per system identifier — models, tools, engines. Model
entries bind to routing classes (handbook execution topology law) and are
version-stamped; exemplars change without a handbook rewrite, because
substitution is a trace-ledger calibration event, not a legislative event.

### A.4 Factory-reserved entities (fixed — part of the operating system)

### Entity: `TaskContract`
- **Definition:** A defined unit of work assigned to an autonomous agent.
- **Forbidden Synonyms:** `Ticket`, `Issue`, `Job`, `Prompt`.

### A.5 Enforcement (instrument classes)

- Forbidden synonyms (Zone C tables): linter naming rules + glossary-aware
  checks at Stage 0 and Stage 2; the adversarial reviewer rejects any PR
  introducing a forbidden variant in code, config, or committed documentation.

## ZONE B — THE STRUCTURE (fixed skeleton)

Canonical section order: Zone A law (fixed, incl. factory-reserved entities) →
Zone C slots in this order: §C.1 Domain entities → §C.2 System identifiers.
A correct entity entry has: name, one-sentence operational definition,
forbidden synonyms, and (for persisted entities) primary key with type.
A correct identifier entry fills every table column — Identifier, Canonical,
Forbidden Variants, Routing Class (or `—`), As of (YYYY-MM). A definition
you cannot apply as a decision procedure is invalid.

## ZONE C — FILLABLE SLOTS (project-specific)

### §C.1 Domain entities
<!-- TEMPLATE_VALUE_REQUIRED — one block per entity.
     Micro-example of a completed entry:
### Entity: `Subscriber`
- **Definition:** A persisted identity with at least one active Entitlement; a lapsed Entitlement makes the identity a Former Subscriber, not a Subscriber.
- **Forbidden Synonyms:** `customer`, `user-with-plan`, `account`.
- **Primary Key:** `subscriberId` (string, ULID).
-->
TEMPLATE_VALUE_REQUIRED

### §C.2 System identifiers
<!-- TEMPLATE_VALUE_REQUIRED — one row per identifier.
     Micro-example of completed rows:
| Identifier | Canonical | Forbidden Variants | Routing Class | As of |
|---|---|---|---|---|
| Frontier model | Kimi K3 | KimiK3, Kimi k3 | Frontier Reasoner | 2026-08 |
| Executor model | GLM 5.2 | GLM-5.2, GLM5.2 | Executor | 2026-08 |
| CLI engine | Pi | pi.dev, Pi.dev CLI | — | 2026-08 |
-->
TEMPLATE_VALUE_REQUIRED

---

**Manifold Amendment Protocol.** Every change to any manifold file follows
GitOps law: PR only, never direct edits on main; the empirical reason
documented in the PR body; manifold_version bumped; last_verified advanced on
merge; the retrieval index over .tmd/ refreshed by the merge hook. A manifold
PR that fails to advance the headers is invalid and is rejected by CI.
