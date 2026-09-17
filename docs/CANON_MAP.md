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

**Status vocabulary:** LIVE (enforced/acted upon today) · STAGED (installed, pinned, driver-smoked, inert until invoked — WP-STACK) · PARTIAL (some
surfaces live, named gaps open) · DEFERRED (registered, activation trigger
defined in docs/CAPABILITY_REGISTER.md) · SOP (operator discipline, per
canon's own assignment — not machinery).

---

## 0. The Nine-Layer Operational Stack (canon: "the operational stack flows through nine layers")

Layers are seats, not procurement categories. Flow rule (canon): code/docs
enter L3 as committed truth → L4 recalls → L2 maps → L1 edits → L0 proves →
L6 compresses → L7 gates → L8 validates on schedule → L5 publishes.

| Layer | Seat | Component(s) | Rig surface | Status |
|---|---|---|---|---|
| L0 Proof | deterministic proof floor | ripgrep (`rg`) | floor tool — `package-pins.json` + PORTABILITY floor list (WP-C2 §8.5) + stack-staging driver | LIVE (STAGED driver, WP-STACK) |
| L1 Hands | symbolic editing | Serena (memory disabled) | register §D.13; STAGED (WP-STACK: venv + catalog + driver) | STAGED (§D.13) |
| L2 Map | code navigation / blast radius | codebase-memory-mcp primary (LadybugDB is its embedded graph store); Graft standby (unstaged — ruling 7) | register §D.25; STAGED (WP-STACK: install + catalog + driver) | STAGED (§D.25) |
| L3 Truth | committed memory / docs substrate | OpenWiki + OpenKB | register §D.25; STAGED (WP-STACK) | STAGED (§D.25) |
| L4 Retrieval | private/public recall | QMD private; Context7 public | Context7: register §D.13; QMD: register §D.25; both STAGED (WP-STACK) | STAGED (§D.13/§D.25) |
| L5 Publish | human/outside-agent publication | Docs7 XOR Docusaurus (one publisher per docs property) | register §D.25 | DEFERRED (§D.25) |
| L6 Compress | token-economy adjunct | Headroom (MCP-server mode only); Tokenjuice (terminal-output pilot) | register §D.8; both STAGED (WP-STACK: headroom-ai 0.3.4 venv + catalog, tokenjuice 0.8.5 npm) | STAGED (§D.8) |
| L7 Gate | PR quality/security gate | DeepSource analyzers (primary), open-code-review (required AI voice), PR-Agent (of record), Betterleaks (VALID blocks), VulnHuntr (scoped), CodeRabbit (WATCH — per-repo conditional successor on same-10-PR evidence) | Betterleaks: §D.6/preflight lane 3 — STAGED binary 1.8.1 on the floor (WP-STACK), lane LIVE; PR-Agent: §D.1; rest: register §D.26 (WP-C2 §8.2) | PARTIAL / DEFERRED |
| L8 Dynamic | scheduled dynamic proof | Strix, Buttercup, OSS-CRS | Strix: §D.9; Buttercup/OSS-CRS: register §D.27 (WP-C2 §8.3) | DEFERRED |

Standing rulings absorbed by this map (canon §4 rulings 4, 7, 8, 9, 11, 12):
PR-Agent of record (not Qodo); codebase-memory-mcp graph of record, Graft
standby, GitNexus out on license, CodeGraph out; OpenWiki+OpenKB substrate
(Mintlify removed as mandate); DeepSource primary / Semgrep fallback-only;
ripgrep = proof, Serena = writes, index = navigation — never substituted;
CodeRabbit never a second AI voice.

## 1. The Constraint-Driven Lifecycle (Five-Phase Methodology + §2.5 Constraint as Code)

| Canon element | Rig surface | Status |
|---|---|---|
| Phase 1 Cognitive Alignment (high-bandwidth questioning) | `skills/project-onboard/` + `bin/onboard-project.mjs` (Zone C interview; drafts require operator approval) | LIVE |
| Phase 2 Topological Mapping (gravity.md, Sub-Graph Registry) | `templates/tmd/gravity.md` three-zone template; `bin/contract-scope.mjs`; `bin/lint-contract.mjs --gravity` | LIVE |
| Phase 2 A2UI review surface (Lavish, lavish-axi) | — | DEFERRED (register §D.5) |
| Phase 3 Contract Drafting & Vertical Slicing | `templates/task-contract.md` (E.1); slicing discipline in `docs/FRESH_PROJECT_SOP.md` | LIVE / SOP |
| Phase 4 Gray Box Protocol (human designs interface, agent fills internals) | `templates/agents/profiles/` (worker/planner split) | LIVE (process) |
| rules.md §1 Anti-Slop Protocol (worker law) | `templates/tmd/rules.md` §1 — verbatim | LIVE |
| rules.md §2 pointer → Part V rubric | `templates/tmd/rules.md` §2 — pointer only | LIVE |
| §2.5 GitOps immutable history (.tmd edits via PR only) | the commit→push→pull chain + `skills/rig-change/` + §5.4 human ratification | LIVE |
| §2.5 LanceDB semantic dedup (TMD_DEDUP_THRESHOLD 0.95, halt + Deduplication PR) | — | DEFERRED (register §D.7) |
| §2.5 commit-triggered re-indexing (QMD / code-graph / LanceDB cadences) | pattern prototyped by `bin/generate-projections.mjs` + `bin/assert-projection-fresh.mjs` (input-head lockstep) | DEFERRED (register §D.7) |
| §2.5 BetterDB session cache exemption | — | DEFERRED (register §D.8) |
| Phase 0 Intent & Specification (TCE v2.1 §2.A) | `templates/specs/`, `bin/lint-spec.mjs`, skills `spec-intake`/`slice-plan`, contract `trace:` field | LIVE (WP-A–C; §D.22 closed) |
| Provenance headers (`derived_from`/`last_reconciled`) | `templates/tmd/*` Zone C mandatory keys + lint-tmd fail-closed check | LIVE (WP-C2) |
| spec §0.6.1 Canon Compiler | bin/canon-compile.mjs + fixtures | LIVE (WP-C2) |
| spec §0.7 Law Economy (15-law budget, placement ladder) | rules.md Zone B statement + lint-tmd | LIVE (WP-C2) |
| spec §0.3 three-zone model (A fixed / B bindings / C PRD-compiled) | templates/tmd/* retitled + lint-tmd heading + provenance checks | LIVE (WP-C2) |
| Phase-0 chain + change semantics (living domain specs, deltas, archive merge — OpenSpec model adopted rig-native) | templates/specs/{domain-spec,delta}.md, bin/archive-change.mjs, lint-spec delta/domain lint, spec-intake/slice-plan v2.1.0 | LIVE (WP-E) |
| Agent memory system (M1/M2, write path, store, retrieval, index) | skills/memory/ + templates/memory/ + bin/memory-verify.mjs + QMD/LanceDB config | LIVE (WP-MEM) |

## SDLC Stage Map (canonical aliases)

The rig's pipeline is isomorphic to the two industry SDLC framings. The rig's
stage names are canonical; the others are aliases for communication only —
documents, skills, and gates always use the rig names.

| Rig stage (canonical) | Anthropic SDLC | agent-skills SDLC | Seat / skill bound | Gate artifact |
|---|---|---|---|---|
| specs/intent.md | Plan (intent half) | DEFINE /spec | interview-me → spec-intake | intent.md |
| PRD | Plan | DEFINE /spec | spec-intake | prd.md + falsifiable hypothesis |
| plan.md | Plan → Design | PLAN /plan | slice-plan (capability map) | plan.md |
| slice + Task Contract | Design → Build | BUILD /build | worker seat (TDD, verification, systematic-debugging bound) | contract + code |
| Validate / QA gate | Test | VERIFY /test | gate drivers (check:fast/task/full) + E.7 holdout; reviewer seat judges | green driver output |
| pr-review | Test → Deploy (review half) | REVIEW /review | pr-review (+ rules-drift-check) | review report |
| PR merge + release | Deploy | SHIP /ship | operator-gated merge | merged PR |
| Incident record + floor ratchet | Maintain | (no equivalent) | doctor seat | incident record, floor.json |

**Two observations, recorded as canon:**
1. **"Design" is not a separate rig stage** — it is distributed: architecture decisions live in plan.md (slice-plan) and the Test Contract's seam choices. A standalone Design stage would duplicate the plan seat (L5).
2. **"Maintain" is the rig's incident-record + floor-ratchet loop** — the closest agent-skills equivalent (shipping-and-launch, deprecation-and-migration) remains shelved adopt-on-trigger. No new stage is added; if recurring maintenance work ever outgrows incident records, that is a rig-change proposal, not an ad-hoc skill.

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

## 6. Harness Handbook v1.2–v1.3 (Parts II–V — harness-native law)

v1.2/v1.3 have their own section numbering; this section indexes them. v1.2-only laws
that are already honored in implementation are cited here so future canon
revisions stay traceable.

| Canon element (v1.2) | Rig surface | Status |
|---|---|---|
| §2.2 binding table — fail-closed guards, mode-aware (headless-deterministic) enforcement | `extensions/bash-guard.ts`, `extensions/sandbox-guard.ts`; footguns recorded in `pi/extensions/API-VERIFIED-0.84.3.md` | LIVE |
| §2.4 projection model + input-head freshness law | `bin/generate-projections.mjs` + `bin/assert-projection-fresh.mjs` | LIVE |
| §2.4 two-part cache-aware composition (stable/dynamic split, `cache_control` ephemeral) | projections implement the split; request structuring rides the gateway | PARTIAL (register §D.10) |
| §2.5 ACC ladder / SCRUB (interactive sessions only) | operator practice; `extensions/memory-toggle.ts` caps | SOP |
| §3.4 The 12 Operator Levers (TAC) | operator discipline; lever surfaces live in `templates/agents/profiles/` | SOP |
| §3.5 Seven-Level Prompt Ladder (spec → template → workflow) | promotion via tool-intake / rig-change | SOP + DEFERRED (register §D.18) |
| §3.7 KPIs and proof of value | requires the trace ledger | DEFERRED (register §D.15) |
| §3.8 Severity taxonomy + failure classes | `templates/agents/schemas/state.schema.yaml` failure_class enums; `bin/lint-state.mjs` | PARTIAL (vocabulary LIVE; routing SOP) |
| §3.10 State-aware rollback (snapshot → restore-to-green) | `extensions/file-changes.ts` is the substrate; the automated path is not built | DEFERRED (register §D.16) |
| §4.1 PETER trigger discipline (surface selection per task class) | mode-aware extensions; `extensions/seat-switch.ts` | SOP |
| §4.2 Meta-prompts, ADWs, HOP | — | DEFERRED (register §D.18) |
| §4.3 Pi-native sub-agent topology (conditional, validation-gated) | — | DEFERRED, specified-but-not-ratified (register §D.17) |
| §4.4 Doom-loop fingerprinting, reminder caps, output loop detector | — | DEFERRED (register §D.16) |
| §4.4 Collision guards (cross-worker read/write pre-ship warning) | named in register §D.1 includes | DEFERRED (register §D.1) |
| §4.5 Role Roster | `templates/agents/profiles/` (scout/planner/worker/reviewer) + `/seat` | LIVE |
| §5.6 Maturity model (in-loop → out-of-loop → ZTE); §5.9 practitioner ladders, pilot exit criteria | `docs/OPERATOR_GUIDE.md` | SOP |
| §5.7 Observability — trace ledger, event taxonomy | — | DEFERRED (register §D.15) |
| §5.8 Consolidated Ruling Registry | canon-resident; rig-side amendments recorded in FACTORY_STATUS open decisions | SOP (ruling: the registry is not duplicated into rig docs — L5) |
| Appendix A (Claude Code shim) / Appendix B (Codex, reserved) | out of scope — single Pi seat; adoption enters via tool-intake + a ruling-registry amendment | SOP (ruling) |
| Appendix C (Kimi Code seat) | terminal seat provider path (docs/provider-setup.md); ADE seat = ZCode+GLM (canon ruling 1, configured outside this repo); editor bridge = Zed+ACP (patches/) | LIVE |
| §4.7 Queue Operations Law (priority, caps, ≤2 attempts, escalation, watchdog D1–D6) | SOP now (FRESH_PROJECT_SOP/OPERATOR_GUIDE); machinery register §D.19 | SOP + DEFERRED |
| §5.10.1 protected list in code, fail-closed | `extensions/guard.ts` + `bin/guard.mjs` + `bin/guard-list.mjs` (WP-C) | LIVE |
| §5.10.2 floor ratchet | `bin/floor-ratchet.mjs` + `.agents/floor.json` (WP-C) | LIVE |
| §5.10.3 raw output wins / loud skips | pr-review skill law (WP-B); gate.py-class precedence | LIVE (process) |
| §5.10.4 mutation testing of the gate | `validation/mutations/` (WP-C) | LIVE |
| §5.6 autonomy dial (0–3, doctor-gated) | `bin/doctor.mjs` + `.agents/autonomy.json` (WP-B) | LIVE (elevation gate; dial ≥2 interlock awaits §D.19 machinery) |
| E.1 holdout truths (builder-blind, read-denied) | contract template + contract-scope read-deny + `bin/tripwire.mjs` (WP-A/WP-C) | LIVE |
| §5.8 ruling: headless compaction ban | OPERATOR_GUIDE SOP; escalation routing §4.7 | SOP |
| §5.8 ruling: headless ask-user → needs_human + proposed answer | `extensions/ask-user.ts` posture doc; machinery §D.19 | SOP + DEFERRED |
| §5.8 ruling: base-branch rulebook reading | `skills/pr-review/` Step 0 (WP-B) | LIVE |
| §5.8 ruling: Stage-6 loop closure | — | DEFERRED (register §D.20) |
| §5.8 ruling: agent-config evals | — | DEFERRED (register §D.21) |
| Appendix §4 A2A Completion Payload Schema | templates/agents/schemas/a2a-completion.schema.json (verbatim) + contract Exit Protocol pointer | LIVE (WP-C2) |

---

*Update rule: when a canon revision lands or a register item changes status,
update this map in the SAME commit (the rig-change skill's checklist points
here). This file is an index — if you are tempted to paste canon text into
it, stop; that is the dilution failure it exists to prevent.*
