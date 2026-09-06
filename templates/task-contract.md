# TASK CONTRACT — template (E.1)

## ZONE A — THE LAW (fixed, invariant — never edit per contract)

**Seat.** The Task Contract is the load-bearing document of the regime. A PRD
is inherently ambiguous — written for human stakeholders, tolerant of
interpretation — while an agent is a stochastic engine for which
interpretation is drift. The contract distills the PRD into a strict,
unambiguous execution boundary that physically binds to the .tmd/ manifold:
it does not restate manifold law (duplication is drift); it INHERITS it, by
naming the manifold slices this task operates under and adding only
task-local specificity.

**The six counter-pathology obligations (§3.1).** Every contract explicitly
counters the six architectural pathologies unbounded agents produce, each by
inheritance from a named manifold file:
1. **Defensive Obesity (the Null Trap)** — scattered null-checks in place of data-flow thought — countered by strict ADTs and structural invariants (rules.md).
2. **Temporal Myopia (the Happy Path)** — network calls treated as instantaneous and infinite — countered by timeout budgets, idempotency keys, circuit breakers (promises.md).
3. **Inconsistent Ontology (Synonym Sprawl)** — a new dialect in every file — countered by the exact entity names of the Semantic Schema (glossary.md).
4. **Horizontal Coding** — layer-by-layer implementation deferring all feedback — countered by the mandated Vertical Slice: every task crosses all architectural layers to produce visible, testable output immediately (phosphorescent feedback).
5. **Boundary Leakage (Spaghetti Imports)** — token-saving shortcuts importing an ORM into a UI component — countered by locking execution to a specific directory layer (gravity.md).
6. **Speculative Bloat (Gall's Law Violation)** — abstract factories for problems that do not exist — countered by the Negative Space command: build only what is asked, then terminate (rules.md).

**must_haves: goal-backward verification.** Truths are behavioral assertions
in Gherkin (Scenario/Given/When/Then) — State > Action > Outcome reasoning;
"vibe coding" is structurally impossible. Artifacts are mechanical existence/
compile checks — scenario syntax there adds ceremony without verification
value. The agent verifies every must_have BACKWARD against the manifold
before it may emit its completion payload. validation_commands must represent
full application state — they are what makes the loop self-validating.

**Format law.** Hybrid Markdown + Conditional YAML: Markdown headers anchor
attention; flat YAML for structured config (nesting depth ≤3). Prose obeys
IDK discipline: Location → Action → Detail; types and signatures as the
densest keywords; the WHAT stated, the HOW left to the engine. The manifest's
trace field binds this contract to the Phase-0 chain; a contract without a
resolvable trace is invalid (TCE v2.1 §2.A). Its holdout pointer names
acceptance truths the worker never sees (Harness E.7).

**Sizing (L8 / §1.4).** If the task's required context exceeds the sizing
budget (default 100K tokens — a decomposition trigger, not an attention
law), the contract is too broad: decompose into smaller vertical slices
BEFORE execution, while decomposition is cheap.

**Exit protocol.** On fulfilling all must_haves, emit the A2A Completion
Payload (E.3): status (SUCCESS|FAIL), worktrunk_path, commit_hash, trace_id
(null under subscription regime), regime, failure_class (canon verdicts) /
error_class (execution errors) as applicable, run_id, parent_trace_id,
artifact_pointers. An invalid payload is not a completion signal — the
orchestrator treats it as a crashed worker.

## ZONE B — THE STRUCTURE (fixed skeleton)

Section order: manifest (YAML) → Goal → Topological Inheritance → Execution
Constraints & FinOps → must_haves (truths, then artifacts) →
validation_commands → iteration/timeout budgets → Exit Protocol.
A correct manifest names a REGISTERED sub_graph from gravity.md's Registry —
a contract with no registered sub-graph is invalid and must not spawn.

## ZONE C — FILLABLE SLOTS

```yaml
manifest:
  contract_id: TEMPLATE_VALUE_REQUIRED          # e.g. task-auth-crud
  manifold_version: TEMPLATE_VALUE_REQUIRED     # semver; MUST match .tmd/ headers at HEAD
  sub_graph: TEMPLATE_VALUE_REQUIRED            # gravity.md Registry node id — defines write scope
  read_closure: TEMPLATE_VALUE_REQUIRED         # declared dependency closure
  regime: subscription                          # gateway | subscription
  model_class: TEMPLATE_VALUE_REQUIRED          # frontier_reasoner | executor | fast_router
  sizing_budget_tokens: TEMPLATE_VALUE_REQUIRED # §1.4 ceiling 1 (default 100000)
  trace: TEMPLATE_VALUE_REQUIRED            # specs/plans/<slug>.md#S<n> — chain back-reference (TCE v2.1 §2.A)
inherit:                                        # named manifold slices, NEVER restated
  rules: [TEMPLATE_VALUE_REQUIRED]              # e.g. ["NO_UPSTREAM_LEAKS @ domain-layer"]
  gravity: [TEMPLATE_VALUE_REQUIRED]            # e.g. ["auth sub-graph boundary"]
  promises: [TEMPLATE_VALUE_REQUIRED]
  glossary: [TEMPLATE_VALUE_REQUIRED]
must_haves:
  truths:
    - scenario: "TEMPLATE_VALUE_REQUIRED"
      given: [TEMPLATE_VALUE_REQUIRED]
      when: [TEMPLATE_VALUE_REQUIRED]
      then: [TEMPLATE_VALUE_REQUIRED]
  artifacts:
    - "TEMPLATE_VALUE_REQUIRED — e.g. src/server/auth/session.ts exists and passes the type-checker"
holdout: .agents/tasks/<contract_id>.holdout.md   # E.7 builder-blind acceptance; read-denied to worker seat
validation_commands: [TEMPLATE_VALUE_REQUIRED]  # must represent full application state
iteration_budget: TEMPLATE_VALUE_REQUIRED       # int
timeout_seconds: TEMPLATE_VALUE_REQUIRED        # int
exit_protocol: emits A2A Completion Payload (E.3)
```

### Micro-example (completed manifest core, auth slice)
```yaml
manifest:
  contract_id: task-auth-session-crud
  manifold_version: 1.0.0
  sub_graph: auth
  read_closure: [shared]
  regime: subscription
  model_class: executor
  sizing_budget_tokens: 100000
inherit:
  rules: ["NO_UPSTREAM_LEAKS", "NO_HAPPY_PATH_ASSUMPTIONS"]
  gravity: ["auth may not import from web-ui"]
  promises: ["external fetch timeout 5000ms"]
  glossary: ["Subscriber", "TaskContract"]
must_haves:
  truths:
    - scenario: "Expired tokens are rejected"
      given: ["a session token past its expiry"]
      when: ["the authentication middleware processes the request"]
      then: ["the request is rejected with an authentication failure", "no session state is mutated"]
  artifacts:
    - "src/lib/domain/auth/session.ts exists and passes tsc --noEmit"
    - "the auth test suite passes with 100% success rate"
validation_commands: ["npm test -- auth", "npm run typecheck"]
iteration_budget: 5
timeout_seconds: 1800
```
