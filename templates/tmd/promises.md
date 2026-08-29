---
manifold_version: "TEMPLATE_VALUE_REQUIRED — semver; bump on any law change, e.g. 1.0.0"
last_verified: "TEMPLATE_VALUE_REQUIRED — SHA of the commit that last modified this file. NEVER a date."
precedence: 3
---

# PROMISES.MD — THE TEMPORAL CONTRACT

Precedence rank 3 of 5. Subordinate to rules.md and gravity.md. Encodes the
physics of asynchronous boundaries: timeouts, retries, idempotency, vendor
pins, mutation integrity, and test determinism.

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

### A.2 Async / network budget law (fixed form; values are Zone C slots)

- **Database queries:** must resolve under the declared budget (Zone C). No deeply nested aggregation inside a single query; paginate or precompute.
- **External fetches:** all third-party calls MUST include an explicit abort/timeout of the declared budget (Zone C). FORBIDDEN: unbounded awaits.
- **Retries:** network failures implement exact 3-attempt exponential backoff.

### A.3 External secrets law (fixed)

- **Environment:** secrets are injected at runtime by the deployment platform. Local execution uses `.env.local` strictly.
- **Constraint:** NEVER hardcode test keys. NEVER log variables containing the strings `secret`, `key`, `token`, or `password`.

### A.4 Mutation Integrity Law (fixed)

1. **Atomic writes:** all file mutations are atomic — write to a temporary file, then rename on success. No actuator may leave a partially written file on disk.
2. **No committable partial state:** a syntactically invalid file must never enter a commit. The Stage-1 compiler gate is the proof instrument.
3. **Severance rollback:** on abnormal termination (budget severance, watchdog kill, container crash), the worktree rolls back to the last green commit before the task re-queues or the worktree is destroyed. The next worker inherits verified state, never a half-mutated corpse it might rationalize into the solution.

### A.5 Test Determinism Law (fixed)

1. **Fixed seeds:** any test touching randomness must pin its seed. Unseeded randomness in tests is forbidden.
2. **Fixture reset per test:** no inter-test shared mutable state. Each test hydrates and tears down its own fixtures.
3. **Wall-clock independence:** tests must not depend on real time, execution order, or machine locality. Time is injected, not read.
4. Flaky tests are defects of the test, not the environment: a test that fails nondeterministically is quarantined and repaired before the pipeline trusts it again. False rejections are a tax on the scarcest resource in the factory — the human gate.

### A.6 Hard gateway cap (fixed form; value is a Zone C slot)

The AI Gateway entry (Zone C) declares the max context window per call. This
is the hard gateway cap — the outermost of the three context ceilings defined
by the handbook's Context Budget Law (task-sizing budget < smart-zone
operating band < this cap). It constrains individual calls, not task sizing.

### A.7 Enforcement (instrument classes)

- §A.2 budgets: linter rules asserting timeout/abort presence on every cross-boundary call; query-timing assertions in Stage 3.
- Zone C vendor pins: dependency-version assertions in CI; human-gate review for vendor-call placement.
- §A.3 secrets: secret-scanner at Stage 0 (local) and Stage 2 (pipeline).
- §A.4 Mutation Integrity: actuator-level temp-file + rename (harness contract); watchdog rollback procedure (handbook supervision law).
- §A.5 Test Determinism: repeated-run flake detection in the scheduled lane (test-runner rerun mode); quarantine list reviewed at the human gate.

## ZONE B — THE STRUCTURE (fixed skeleton)

Canonical section order: Zone A law (fixed) → Zone C slots in this order:
§C.1 budget values → §C.2 vendor constraints & limits (incl. AI Gateway cap) →
§C.3 project-specific temporal law, if any. A correct budget entry is a
concrete number with units. A correct vendor entry carries: version pin,
placement constraint, and budget. Pins bump only via manifold PR. An entry
without a number is invalid — "fast" and "reasonable" are not budgets.

## ZONE C — FILLABLE SLOTS (project-specific)

### §C.1 Budget values
<!-- TEMPLATE_VALUE_REQUIRED.
     Micro-example:
```yaml
budgets:
  database_query_ms: 200
  external_fetch_timeout_ms: 5000
```
-->
TEMPLATE_VALUE_REQUIRED

### §C.2 Vendor constraints & limits
<!-- TEMPLATE_VALUE_REQUIRED — one entry per external vendor.
     Micro-example:
```yaml
vendors:
  - name: Stripe
    version_pin: "14.x"
    constraint: "never synchronous inside a persistence mutation; background actions only"
  - name: AI Gateway
    endpoint: "<gateway endpoint>"
    hard_cap_tokens_per_call: 200000
```
-->
TEMPLATE_VALUE_REQUIRED

### §C.3 Project-specific temporal law (optional)
<!-- Add entries ONLY for temporal law unique to this project (idempotency
     keys, outbox patterns, compensating actions). Global law lives in Zone A;
     adding it here is duplication — drift.
     Micro-example:
     - idempotency: "All POST /orders writes carry a client-generated idempotency key; replays return the original result."
-->
TEMPLATE_VALUE_REQUIRED (or state: none)

---

**Manifold Amendment Protocol.** Every change to any manifold file follows
GitOps law: PR only, never direct edits on main; the empirical reason
documented in the PR body; manifold_version bumped; last_verified advanced on
merge; the retrieval index over .tmd/ refreshed by the merge hook. A manifold
PR that fails to advance the headers is invalid and is rejected by CI.
