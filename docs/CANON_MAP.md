# CANON_MAP.md — where the TCE canon lives in this rig (WP11)

**Purpose.** This is the durable index from canon to enforcement surface.
It answers two questions without a chat session: *"where is canon section X
acted upon?"* and *"what is its status — live, partial, or deferred?"*.

**What this file is NOT.** It is not a copy of the canon. Canon is never
chunked into rig docs (L5 — reference, never restate): copies drift, edits
get lost in the middle, and dilution is contamination. The only verbatim
canon in this repo is where canon itself mandates machine-enforced law
(`templates/tmd/rules.md` §1, the Anti-Slop Protocol; `templates/wt.toml`
hook contract). Everything else is a pointer. If you want canon under
version control, commit the handbook set as ONE read-only verbatim snapshot
(docs/canon/, replaced wholesale on each canon revision, never edited
piecemeal) — this map references section numbers either way.

**Status vocabulary:** LIVE (enforced/acted upon today) · PARTIAL (some
surfaces live, named gaps open) · DEFERRED (registered, activation trigger
defined in docs/CAPABILITY_REGISTER.md) · SOP (operator discipline, per
canon's own assignment — not machinery).

---

## 1. The Constraint-Driven Lifecycle (Four-Phase Methodology + §2.5 Constraint as Code)

| Canon element | Rig surface | Status |
|---|---|---|
| Phase 1 Cognitive Alignment (high-bandwidth questioning) | `skills/project-onboard/` + `bin/onboard-project.mjs` (Zone C interview; drafts require operator approval) | LIVE |
| Phase 2 Topological Mapping (gravity.md, Sub-Graph Registry) | `templates/tmd/gravity.md` three-zone template; `bin/contract-scope.mjs`; `bin/lint-contract.mjs --gravity` | LIVE |
| Phase 2 A2UI review surface (Lavish, lavish-axi) | — | DEFERRED (register §D.5) |
| Phase 3 Contract Drafting & Vertical Slicing | `templates/agents/tasks/task-contract.md` (E.1); slicing discipline in `docs/FRESH_PROJECT_SOP.md` | LIVE / SOP |
| Phase 4 Gray Box Protocol (human designs interface, agent fills internals) | `templates/agents/profiles/` (worker/planner split) | LIVE (process) |
| rules.md §1 Anti-Slop Protocol (worker law) | `templates/tmd/rules.md` §1 — verbatim | LIVE |
| rules.md §2 pointer → Part V rubric | `templates/tmd/rules.md` §2 — pointer only | LIVE |
| §2.5 GitOps immutable history (.tmd edits via PR only) | the commit→push→pull chain + `skills/rig-change/` + §5.4 human ratification | LIVE |
| §2.5 LanceDB semantic dedup (TMD_DEDUP_THRESHOLD 0.95, halt + Deduplication PR) | — | DEFERRED (register §D.7) |
| §2.5 commit-triggered re-indexing (QMD / code-graph / LanceDB cadences) | pattern prototyped by `bin/generate-projections.mjs` + `bin/assert-projection-fresh.mjs` (input-head lockstep) | DEFERRED (register §D.7) |
| §2.5 BetterDB session cache exemption | — | DEFERRED (register §D.8) |

## 2. The CI/CD Integration Engine (The Refinery)

| Canon element | Rig surface | Status |
|---|---|---|
| Stage 0 local pre-flight (Semgrep SAST floor before commit) | `bin/preflight.mjs` + `templates/semgrep/base.yml` (WP11) | LIVE |
| Stage 0 Betterleaks secrets lane | preflight lane 3 (dialect-probed) | LIVE (pin pending, register §D.6) |
| Stage 0 AsyncReview semantic pass | — (intake findings recorded) | DEFERRED (register §D.14) |
| Stage 0 Podman/Daytona sandbox confinement | harness-level brakes only: `extensions/bash-guard.ts`, `extensions/sandbox-guard.ts` | PARTIAL (register §D.2) |
| Stage 1 deterministic gates (Fallow, ESLint, tsc, bun test; Blacksmith/Hetzner hardware) | — | DEFERRED (register §D.1) |
| Stage 2 agent-adversarial review (PR-Agent via LiteLLM, .pr_agent.toml; open-code-review pilot; weekly CodeQL) | — | DEFERRED (register §D.1) |
| Stage 3 E2E (ephemeral Convex preview, Playwright baseline + Midscene semantic fallback, action circuit breaker) | — | DEFERRED (register §D.3) |
| Stage 3.5 pilots (Strix pentest lane; Claw Patrol egress firewall) | — | DEFERRED, pilot-gated by canon itself (register §D.9) |
| Stage 4 human gate (24h SLA, staleness rebase, low-risk auto-merge) | `skills/pr-review/` is the rubric surface; SLA/auto-merge need the merge queue | SOP + DEFERRED (register §D.1) |
| Stage 4 deterministic-trail-first rule ("review begins only after inspecting the full pipeline trail") | `skills/pr-review/` Step 1 — preflight trail is a hard precondition | LIVE (WP11) |
| §2.8 CD handoff (Vercel edge / Hetzner+Coolify; agents forbidden from writing deploy scripts) | — | DEFERRED (register §D.1) |
| §2.9 offline/online evaluations, quality flywheel (turns/cost to converge) | — | DEFERRED (register §D.7) |
| Merge queue physics (batch-then-bisect, pairwise-conflict serialization, Worktrunk isolation) | `templates/wt.toml` hook contract (inert until Worktrunk adopted) | DEFERRED (register §D.1) |

## 3. Part V: The Principal Review Rubric (The Ten Marks)

| Canon element | Rig surface | Status |
|---|---|---|
| Ten Marks as reviewer detection methods | `skills/pr-review/` Step 3 + `templates/agents/profiles/reviewer.md` (via `/seat reviewer`) | LIVE |
| "referenced by pointer, never duplicated into the manifold" | `templates/tmd/rules.md` §2 pointer; L5 driver checks | LIVE |
| Worker-facing counterpart = Anti-Slop Protocol only | `templates/tmd/rules.md` §1 verbatim | LIVE |
| Judgment at the gate remains human | skill emits EvaluationResult; human ratifies merge | LIVE (process) |

## 4. Agentic DevSecOps & FinOps (canon §6)

| Canon element | Rig surface | Status |
|---|---|---|
| §6.6 Mandate 2 script-execution shield (--ignore-scripts) | ratified constraint; `package-pins.json` policy; `bin/lint-mcp.mjs` | LIVE |
| §6.6 Mandate 3 lockfile determinism (exact pins, frozen installs, no forced audit fixes) | ratified constraint; `package-pins.json` ledger; runbook | LIVE |
| §6.6 Mandate 1 dev-container quarantine (Daytona/rootless Podman) | — | DEFERRED (register §D.2) |
| §6.4 Dual FinOps Regime (subscription lane: harness brakes are the only mechanical brakes) | `docs/FRESH_PROJECT_SOP.md`; STATE.md `finops{}` block (`lint-state.mjs` enforces) | LIVE |
| §6.4 budget_severance as first-class failure verdict | `templates/agents/schemas/state.schema.yaml` failure_class enum | LIVE |
| §6.4 Meta-Harness Violations (no unratified self-legislation) | §5.4 ratification; `skills/rig-change/`; human-only `extensions/seat-switch.ts` | LIVE |
| §6.4 LiteLLM gateway, circuit breakers, A2A chargeback tracing | — | DEFERRED (register §D.10) |
| §6.4 token-economy adjuncts (Headroom, Ponytail, Tokenjuice; Caveman WATCH) | — | DEFERRED (register §D.8) |
| §6.1 Hetzner perimeter (Tailscale mesh, CrowdSec, Traefik SSL) | — | DEFERRED (register §D.11) |
| §6.2 Convex mandate (schema.ts only; ORM ban; deployment ban) | activation notice T3; project manifold promises.md Zone C | PARTIAL (register §D.3) |
| §6.3 tri-layer protocol (local pre-flight; prompt firewalls; CI SAST block) | local layer LIVE (WP11 preflight); prompt firewalls + CI layer DEFERRED | PARTIAL (register §D.1/§D.6) |
| §6.5 context safety ceilings (15% global buffer); BetterDB semantic cache | caps in memory-toggle (8KB) / seat-switch (16KB); BetterDB DEFERRED | PARTIAL (register §D.8) |
| §6.7 State Survival Law (manifold durable by GitOps; ledger replication; rig-rebuild runbook) | manifold durability LIVE (the chain); ledger replication + runbook DEFERRED | PARTIAL (register §D.12) |

## 5. Production Workflows (canon §7 Greenfield & Brownfield)

| Canon element | Rig surface | Status |
|---|---|---|
| §7.1 Phase 1 Plan (codify manifold; task contract with must_haves) | `skills/project-onboard/` + E.1 contract schema + lint-contract | LIVE |
| §7.1 Phase 2 Piston Strike (fresh worktrunk, bound profile, manifold ingestion) | `templates/wt.toml` hook contract; `/seat` profile binding | PARTIAL (Worktrunk adoption pending, register §D.1) |
| §7.1 Phase 2 Context Boundary (the 60% Rule — human watches the gauge, orders the flush) | STATE.md + `bin/state-genesis.mjs` are the flush artifact; the watch itself is operator SOP (`docs/OPERATOR_GUIDE.md`) | SOP |
| §7.1 Phase 3 Refinery handoff | — | DEFERRED (register §D.1) |
| §7.1 Phase 3 System Evolution (update the manifold to forbid the bug's anti-pattern) | `skills/rig-change/` amendment loop | LIVE |
| §7.2 Brownfield archaeology (GitNexus AST maps; jCodeMunch extraction; AMUX read-only swarm; artifact hierarchy) | artifact hierarchy LIVE (templates); the swarm stack DEFERRED | PARTIAL (register §D.4) |

---

*Update rule: when a canon revision lands or a register item changes status,
update this map in the SAME commit (the rig-change skill's checklist points
here). This file is an index — if you are tempted to paste canon text into
it, stop; that is the dilution failure it exists to prevent.*
