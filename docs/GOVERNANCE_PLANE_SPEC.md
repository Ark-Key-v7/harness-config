# Factory Rig — Governance Plane Build Spec

**Document class:** Handover specification (human-ratified). This document is the single entry point for building the Pi governance plane. It transcribes canonical requirements from the two source handbooks, records decisions ratified in the build conversation, and defines acceptance criteria per work package. A fresh session or agent reading this document must be able to execute without re-deriving any decision.

**Status:** RATIFIED SPEC — nothing in this document is built yet except where marked EXISTING.
**Created:** 2026-08-27
**Supersedes:** nothing. **Amended by:** human-ratified PR only (Meta-Harness Restriction, Harness Handbook §5.4).

---

## 1. Canon sources and precedence

Two source documents govern this build. Where they conflict, the newer one wins.

| Source | File | Role |
|---|---|---|
| **Harness Handbook v1.2** (2026-08-12) | `1.2 Coding Agent Harness Handbook — v1.2.md` | Primary. Pi.dev harness binding, extension API, system-prompt planes, config-as-code, role roster, skills architecture, schemas (Appendix E) |
| **TCE Handbook v2.0** | `1.0 TCE_ Agentic SWE Handbook.md` | Foundational. Topological Constraint Engineering canon, factory rig topology, memory/tooling seats, CI/CD refinery |

**Known reconciliations (decided by v1.2, recorded here so they are never re-litigated):**

1. **jCodeMunch is SUPERSEDED** (v1.2 §2.12: "its seat covered by Serena plus the dual graph engines; its mentions in earlier canon sections are treated as legacy"). TCE §3.5's Tier-1 jCodeMunch mandate is overridden. Do not install jCodeMunch.
2. **QMD delivery form:** CLI + Skill (progressive disclosure), NOT its MCP server (v1.2 §2.12 overrides TCE §3.4 on Context Budget Law grounds). The health probe and degradation ladder from TCE §3.4 still bind.
3. **MCP strategy:** Pi ships no MCP host. Client half = `pi-mcp-adapter` (installed and committed, not built). Server half = rig services behind ingress. Transport rule: stdio by default; HTTP only when a second concurrent consumer can be named (v1.2 §2.11).
4. **Failure vocabularies are dual, never remapped:** `failure_class` (canon's seven factory verdicts) and `error_class` (six execution-error classes) are separate keys (v1.2 Appendix E reconciliation note).

---

## 2. What exists today (baseline)

**EXISTING — Factory substrate, validated, tagged `factory-rig-v1.0.0`:**

- Pi 0.84.3 (`@earendil-works/pi-coding-agent`), provider: built-in `kimi-coding` (Kimi OAuth), credentials externalized to `~/.pi/secrets/pi-auth.json` (mode 600), symlinked to `~/.pi/agent/auth.json`.
- Factory Floor: Worktrunk 0.74.0, AMUX (pinned commit `a78ed225…`, systemd-user service, nftables localhost guard on port 8824), QMD 2.8.3, LanceDB 0.37.1 (minimal install, `--omit=optional`), Semgrep 1.174.0 (venv), Betterleaks 1.8.1, Fallow 3.18.0, PR-Agent 0.42.0 (rootless Podman, report-only wrapper, `--network none`), tmux, rootless Podman.
- `harness-config` repo: source at `~/factory-rig/sources/harness-config`, active clone (read-only) at `~/.pi/agent`. GitHub: `git@github.com:Ark-Key-v7/harness-config.git`. Contains `rig.manifest.yaml`, `package-pins.json`, `settings.json`, `templates/AGENTS.md`, `templates/tmd/*.md` (INERT — see WP4), `pi/extensions/README.md`.
- Supply-chain discipline: exact pins, checksum verification, `--ignore-scripts`, no `curl|sh`, **`npm audit fix --force` is forbidden** (it downgraded LanceDB 0.37.1 → 0.30.0 during the build; audit is a report, never authorization).

**NOT BUILT — the governance plane (this spec's subject):** Pi extensions, SYSTEM.md/projection layer, role roster profiles, skills scaffold, task-contract template, project `.pi/` template, STATE.md convention, TMD onboarding workflow, and the law-bearing TMD templates.

**Consequence:** the installed Pi is a stock harness with a hardened supply chain. No canon principle is enforced at runtime. The four enforcement planes (Section 3) are all unbuilt except documentation.

---

## 3. The Four Enforcement Planes (architecture model)

Every canon principle becomes real in one or more of these planes. The build is complete only when each mandated principle lives in at least one of planes 1–3.

1. **Prompt plane** — the agent *sees* the law. SYSTEM.md / append-system projections, two-part cache-aware composition (stable/dynamic), `before_agent_start` injection of manifold pointers each turn (Pull model, v1.2 §2.4).
2. **Tool-interception plane** — the agent *cannot break* the law. TypeScript extensions on `tool_call` / `tool_result` events: bash guard with DANGER class, sub-graph sandbox guard, stale-read guard, file-changes log (v1.2 §2.3, §3.2, §3.10).
3. **Validation plane** — the law is *checked*. Semgrep / Betterleaks / Fallow / PR-Agent in CI, manifold stamping gates, skill validation scripts (exit-code routing), spawn-time projection checks (EXISTING tools, not yet wired into a pipeline).
4. **Documentation plane** — humans and future sessions *know* the law. FACTORY_STATUS.md, update runbook, fresh-project SOP, portability guide, this spec, law-bearing templates.

---

## 4. Governing laws that bind every work package

These are transcribed from canon and bind all WP outputs. Each WP's acceptance criteria reference them.

**L1 — Meta-Harness Restriction (v1.2 §5.4).** No agent autonomously mutates the governing layer (extensions, guards, profiles, skills, manifold, settings). An agent may *propose*; changes land only via human-reviewed, human-merged PR. "An agent that can edit its own wall has no wall."

**L2 — Instruction-File Boundary (v1.2 §1.3).** Exactly one root AGENTS.md per repo, ≤50 lines, zero constraint text — a routing map pointing to `/.tmd/`, `/.agents/profiles/`, `/.agents/skills/`, and build/test commands. No other instruction files below root. Harness markdown lives only in `/.agents/`.

**L3 — Manifold precedence and Conflict Halt (v1.2 §1.3).** Total order: rules.md (1) > gravity.md (2) > promises.md (3) > glossary.md (4) > design.md (5). Conflicts resolve by arithmetic, never agent judgment. On cross-file contradiction: halt the Task Contract, emit `MANIFOLD_CONFLICT` to the trace ledger naming both files and clauses, wait for a human PR; resume re-reads from new HEAD, never cached context.

**L4 — Manifest Header (v1.2 §1.3).** Every manifold file opens with YAML: `manifold_version` (semver), `last_verified` (commit SHA), `precedence` (rank). A file without a valid header is invalid law; agents halt on encountering one.

**L5 — No duplicated law (v1.2 §1.3, §2.4).** Constraint text lives once, in the manifold. Projections (SYSTEM.md, `.pi/`, harness shims) contain pointers and generated bindings, never restated constraint text. Restatement is drift; drift is slop.

**L6 — Config-as-Code (v1.2 §2.9).** The committed set per project repo: `/.tmd/`, `/.agents/`, `/.pi/`, root AGENTS.md, generated harness shims. Reproducibility (fresh rig + repo reconstructs full behavior), reviewability (all changes are PRs), drift audit (CI regenerates projections and fails on diff).

**L7 — Actuation Boundary (v1.2 §2.12, TCE §II.2.1).** Agents never select tooling. Semantic search is always QMD; persistent caching is always LanceDB; the tool set is constraint geometry, not a menu.

**L8 — Context Budget Law (v1.2 §1.4).** Three ordered ceilings, never conflated: task-sizing budget (default 100K tokens — a decomposition trigger) < operating smart zone (40–60% of *verified effective* window) < hard gateway cap (declared in promises.md).

**L9 — Fail-closed by default (v1.2 §3.2).** Enforcement is mechanical, never disciplinary. A throwing `tool_call` handler blocks the tool; unresolvable write sets fail closed; permission popups are denied in favor of deterministic hooks.

**L10 — Two-subdirectory rule (v1.2 §3.9).** What defines an agent's capacity is law and is versioned; what an agent did is telemetry and is ephemeral. The two never share a directory's git treatment.

**L11 — Freshness Law (v1.2 §2.12).** Every retrieval index is invalidated by the same event that invalidates its content: a commit. Post-merge hooks re-index; worktree-spawn hooks refresh the spawned subtree. An index serving superseded HEAD is wrong law.

**L12 — Supply-chain policy (v1.2 §5.5 + ratified build practice).** Exact pins, integrity hashes, `--ignore-scripts`, no `curl|sh`, no `npm audit fix --force` on pinned packages, adversarial/obfuscated installs only inside disposable containers.

---

## 5. Work packages

Execution order is dependency order. WP0 unblocks everything. Each WP ends with a commit to `harness-config` and a manifest entry.

### WP0 — Pi extension API inspection (UNBLOCKING STEP)

**Why first:** the build rule from `pi/extensions/README.md` stands: *do not fabricate extension source against an unverified API.* All extension WPs depend on the verified API surface of pinned Pi 0.84.3.

**Do:**
1. Locate the installed package: `~/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent/` (confirm actual path via `npm root -g`).
2. Extract the ExtensionAPI TypeScript definitions (event names, handler signatures, `ctx` surface, `pi.registerTool/Command/Provider` signatures, blocking semantics of throwing handlers).
3. Record findings in `harness-config/pi/extensions/API-VERIFIED-0.84.3.md`: each event/hook used by WP1–WP3, with the exact signature quoted from the installed source.

**Acceptance:** every extension written later imports only API elements present in that verified record. Any canon-described event that does not exist in 0.84.3 is recorded as a divergence with a fallback design, never silently substituted.

### WP1 — Baseline extension set (v1.2 §2.3)

Four extensions, in canon installation-priority order, committed under `harness-config/pi/extensions/` and deployed to `~/.pi/agent/extensions/`.

1. **Bash guard.** Intercepts `tool_call` on bash; deterministic fail-closed ruleset. Must implement the **DANGER class — no-override, enumerated**: recursive root/filesystem deletion (`rm -rf /` and rooted variants), fork bombs / resource-exhaustion constructs, pipe-to-shell (`curl|bash`, `wget|sh` and equivalents), raw device writes (`dd` to block devices), disk operations (mkfs/fdisk/parted class), force-push to protected branches. DANGER rules have no allowlist, no escalation, no runtime override; blocks are logged; changing the list is a §5.4 PR. PATTERN/COMMAND/PREFIX rules below DANGER may escalate; DANGER may not.
2. **File-changes log with undo.** Write/edit tool calls produce structured deltas (paths, line counts, diffs); operator can revert a single change without git archaeology. Doubles as §5.7 audit substrate.
3. **Ask-user tool.** Structured questionnaire the model invokes mid-turn (typed options or free text) — converts uncertainty into a schema'd tool call instead of prose questions.
4. **Memory toggle.** `/memory` command flips project `memory.md` injection on/off; when on, injects a usage block teaching proactive read/update.

**Authoring rules (bind all four, v1.2 §2.3):** schemas minimal and strictly typed; descriptions information-dense, stating preconditions; outputs follow AXI (token-efficient structured text, only what the next reasoning step needs).

**Acceptance:** each extension loads via jiti without a compile step; DANGER-class fire tests block unconditionally (test at least `rm -rf /`, `curl … | bash`, `dd of=/dev/sda`, `git push --force` to a protected-branch pattern); non-DANGER granular rules escalate per design; file-changes log reverts one edit cleanly; all fire-test transcripts committed under `~/factory-rig/validation/extensions-smoke/`.

### WP2 — Sub-graph sandbox guard (v1.2 §3.2)

**Requirement:** a `tool_call` guard extension resolving every file-operation path argument against `gravity.md`'s Sub-Graph Registry (read directly — the Registry stays the single source of truth). Write scope = declared sub-graph nodes from the active Task Contract; read scope = sub-graph + declared dependency closure; every other path resolves to DENY, including the discovery attempt.

**Bash channel (enumerated, not trusted):** the guard resolves bash command lines against the same write scope, covering: in-place editors (`sed -i`, `perl -pi`, `awk -i`), output redirection (`>`, `>>`, `tee`), block/device writers (`dd`), git working-tree mutators (`git checkout --`, `git restore`, `git apply`, `patch`), package-manager writes. A command whose write set cannot be statically resolved **fails closed** — blocked, logged, routed to the contract's escalation path. Residual risk (eval chains, encoded payloads) is accepted only inside disposable container boundaries, never on the host.

**Also include the stale-read guard (v1.2 §3.10):** before any write, check whether a file the agent read earlier changed since the read (mtime comparison); if changed, block the write, re-read, recompute.

**Acceptance:** in a fixture repo with a two-node Registry, out-of-scope writes and reads are blocked pre-execution (operation never runs); each covered bash mutation class is blocked when targeting out-of-scope paths; unresolvable commands fail closed; stale-read fire test blocks and re-reads. Depends on WP4 (gravity.md Registry format) and WP7 (contract's `sub_graph` field) for fixtures.

### WP3 — SYSTEM.md composition and the projection generator (v1.2 §2.4)

**Requirement:**
1. **Projection generator:** a committed script in `harness-config` (never hand-editing, never agent-run autonomously) that emits per-seat projections from manifold + profiles: Pi's append-system content (default projection target), `.pi/` config, and reserved shims for appendix harnesses. Projections contain pointers and generated bindings only (L5).
2. **Two-part cache-aware composition:** stable part (manifold projections, SYSTEM.md/append-system, tool schemas — flagged cacheable) vs dynamic part (environment metadata, per-turn `before_agent_start` injection). Never interleave per-turn content into the stable part (one volatile line invalidates the cached prefix).
3. **SYSTEM.md (full replace)** used sparingly and only generated — the replacement must re-provide whatever the default prompt did (tool-use conventions, safety framing).
4. **Triggers and staleness:** projections regenerate on (a) manifold commit — CI regenerates and commits projections in the same PR, and (b) Worktrunk post-create hook — spawn verifies projections against HEAD; a projection older than its source HEAD fails the spawn assertion. No time-based staleness: a projection is at its source's HEAD or invalid.

**Acceptance:** generator runs deterministically (same input → byte-identical output); CI drift check (regenerate, fail on diff) passes on a clean tree and fails on a hand-edited projection; spawn-time staleness assertion blocks a deliberately staled fixture projection.

### WP4 — TMD template law transcription (THE TEMPLATES FIX)

**Problem being fixed:** the current `templates/tmd/*.md` are placeholder skeletons — they state that a file exists, not what it *is*. The TMD Specification (v1.2 §1.3) is invariant law and must be embedded in the templates.

**The three-zone template contract (ratified):** every manifold template carries —
- **Zone A — The Law (fixed, invariant, never edited per project):** the file's contract class and precedence rank (table below), its obligations, its prohibitions, its validation gates, and its interaction rules (precedence arithmetic, Conflict Halt, header law, monorepo inheritance).
- **Zone B — The Structure (fixed skeleton):** mandatory section layout with per-section instructions describing what a *correct* entry looks like and why.
- **Zone C — The Fillable Slots (project-specific):** marked `TEMPLATE_VALUE_REQUIRED` regions, each annotated with what belongs there plus one worked micro-example of a completed entry.

**Canonical law to transcribe, per file (v1.2 §1.3):**

| File | Contract | Class of law | Key content the template must teach |
|---|---|---|---|
| rules.md (prec 1) | Negative Protocol | Safety law | Forbidden abstractions, banned patterns, anti-slop law; path-scoped `applies_to:` for monorepo specificity |
| gravity.md (prec 2) | Force Contract | Structural law | Dependency graph, module boundaries, **Sub-Graph Registry** (the named node IDs that task contracts and the WP2 guard resolve against) |
| promises.md (prec 3) | Temporal Contract | Behavioral law | Timeouts, idempotency, retry budgets, mutation integrity, test determinism, **hard gateway cap** (L8 ceiling 3) |
| glossary.md (prec 4) | Semantic Schema | Vocabulary law | Ubiquitous language, system identifiers; every normative term used in prec 1–3 files MUST be defined here; one term = one definition; synonym sprawl prohibited |
| design.md (prec 5) | Visual Protocol | Presentation law | Tokens, primitives, interaction states |

Plus, in every template's Zone A: the precedence table, the Precedence Law, the Conflict Halt procedure, the Manifest Header requirement (L4), Monorepo Inheritance (one manifold per repo at root; package-local manifold files forbidden), and `last_verified` stamping semantics (a commit SHA, not a date — **divergence from the current inert templates, which use a date placeholder; fix this**).

**Also revise** `templates/AGENTS.md` to the same three-zone standard within its ≤50-line cap (router law only; Zone A compressed to the boundary rules).

**Acceptance:** the coworker test (v1.2 §3.11) applied per file — a competent engineer who has never seen the canon can author a valid manifold file from the template alone, and can state what makes an entry *invalid*.

### WP5 — Role roster profiles (v1.2 §4.5, §3.9, Appendix E.5)

**Requirement:** four committed Agent-as-Code profiles under `templates/agents/profiles/`, following schema E.5 exactly:

- **Scout** — write scope: none; read: sub-graph + dependency closure; fast/cheap model class; exploration, returns synthesized findings, never edits.
- **Planner** — write: specs/plan files only; read: full manifold + relevant sub-graphs; frontier reasoner class; drafts Task Contracts and plans.
- **Worker** — write: declared sub-graph only; read: sub-graph + closure; task-matched class; executes one contract under one sandbox, carries the full must_haves burden.
- **Reviewer** — write: none (verdicts only); read: spec + diff + validation output; strong class, fresh context; verifies conformance to intent (review is not re-testing).

**Roster laws (Zone A of each profile):** minimal loadout (a scout with write tools is a misconfigured worker); fresh context per role instance — handoff by file artifact, never session inheritance; roster changes are governance (human PR only).

**E.5 schema fields:** `profile`, `compute_physics` (model_class, effort_level, substitution_bounds), `actuation_boundary` (tool_allowlist, command_allowlist), `tmd_read_path`, `write_scope`, `read_scope`. Profiles state parameters, not personality; every sentence must be checkable by a mechanism (v1.2 §3.11).

**Acceptance:** all four profiles validate against E.5; each maps its actuation boundary to concrete WP1/WP2 enforcement (prose proposes, hooks dispose); the Kimi-subscription regime's model-class mapping is stated explicitly for the current single-provider rig.

### WP6 — Skills scaffold (v1.2 §5.1, Appendix E.6)

**Requirement:**
1. `templates/agents/skills/` scaffold implementing the **Sovereign Skill Protocol**: kebab-case folder, file named exactly `SKILL.md`, four progressive-disclosure tiers (trigger frontmatter → procedure body → explicit manifold reads → bundled `scripts/`, `assets/`, `references/`).
2. **E.6 frontmatter contract:** `name` (kebab-case), `description` (trigger-precise context pointer), `trigger_phrases: [...]`, `invocation: <user|model>` (default `user`). No XML angle brackets anywhere in frontmatter or metadata.
3. **Procedure form:** strict Act → Observe → Exit loop; one of the five execution topologies (sequential gates / multi-tool coordination with explicit state passing / bounded iterative refinement / context-aware sub-graph routing / graph-engine domain extraction).
4. **Deterministic validation:** validation logic in `scripts/` executables, not prose; exit code 0 = success, 1 = must_haves mathematically unsatisfied (agent forbidden from marking complete).
5. **Dual-state actuation:** a skill with physical effect ships actuator + resolution procedure together.
6. **Admission gate** (documented in the scaffold's README): trigger precision, structure, steering, pruning (deletion tests; no duplicated manifold content; no sediment).
7. **Ladder decision rule** (documented): behavior → skill; callable code → extension tool; distribution → package; bounded identity → profile.

**Acceptance:** one reference skill (recommended: the QMD CLI skill, since QMD's delivery form is CLI+Skill per §2.12 — includes the boot-time known-answer health probe and the degradation ladder: full hybrid → BM25-only with degraded ledger flag → halt-with-escalation) passes the full admission gate.

### WP7 — Task Contract template (v1.2 §3.1, Appendix E.1)

**Requirement:** `templates/task-contract.md` implementing schema E.1 (Hybrid Markdown + Conditional YAML): `manifest` (contract_id, manifold_version matching .tmd/ headers at HEAD, sub_graph, read_closure, regime, model_class, sizing_budget_tokens), `inherit` block (named manifold slices — never restated), `must_haves` (Gherkin `truths` + mechanical `artifacts`), `validation_commands` (must represent full application state), `iteration_budget`, `timeout_seconds`, exit protocol (A2A Completion Payload, E.3).

**Zone A must teach:** the six counter-pathology obligations (Defensive Obesity → rules.md; Temporal Myopia → promises.md; Inconsistent Ontology → glossary.md; plus the remaining three per §3.1); the contract inherits manifold law, never duplicates it; the 100K sizing budget as decomposition trigger (L8).

**Acceptance:** template passes the coworker test; a filled example contract (from the smoke fixture repo) validates against E.1 and drives a WP2 guard test end-to-end.

### WP8 — Project `.pi/` template and MCP curation (v1.2 §2.9, §2.11)

**Requirement:** `templates/pi/` — the committed project-local Pi layer: settings, extension wiring (project-local guards), prompt-template pointers, and curated `.mcp.json`.

**MCP rulings that bind (v1.2 §2.11):** client half is `pi-mcp-adapter` (adopted, pinned, committed — not built); one `mcp` proxy tool with on-demand search/describe/call; `directTools` promotion for hot paths; `freezeDirectTools` for prompt-cache stability; stdio transport default (HTTP only when a second concurrent consumer is named); protocol negotiation pinned per server; zero new dependencies on deprecated Roots/Sampling/Logging (MCP 2026-07-28).

**Prerequisite check:** verify `pi-mcp-adapter` compatibility against Pi 0.84.3 during WP0; record the pin decision in `package-pins.json`.

**Acceptance:** a fresh project initialized from `templates/` boots Pi with the committed `.pi/` layer and no manual configuration; `.mcp.json` contains only curated, pinned servers (empty is valid).

### WP9 — STATE.md convention and Worktrunk post-create hook (v1.2 §3.3, Appendix E.2)

**Requirement:**
1. STATE.md is **per-worktree**, created by the Worktrunk post-create hook from schema E.2, mounted into the sandbox, destroyed at teardown. A repo-level shared STATE file is forbidden.
2. The hook's boot contract is fail-closed: dependency restoration → STATE.md genesis → mount injection → **pre-flight visibility assertion** (worktree, STATE.md, declared read closure actually mounted and readable) with `on_failure = abort`; aborts emit `SPAWN_ABORT` to the ledger. The contract is append-only: later hardening may add assertions, never weaken.
3. E.2 fields include the chaining family (`run_id`, `parent_trace_id`, `prior_step_refs`, `artifact_pointers`) and the dual failure vocabulary (`failure_class`, `error_class`).

**Acceptance:** `wt` worktree creation produces a schema-valid STATE.md; removing a mount path in a fixture triggers SPAWN_ABORT; teardown destroys STATE.md.

### WP10 — TMD onboarding workflow (fresh-project procedure)

**Requirement:** the documented, repeatable onboarding sequence for a new product repository (this feeds the Fresh Project SOP deliverable):

1. **Phase 1 — Cognitive alignment:** copy `templates/` → root AGENTS.md, `.tmd/`, `.agents/`, `.pi/`; human + agent walk the codebase; fill Zone C slots.
2. **Phase 2 — Topological mapping:** declare Sub-Graph Registry nodes and dependency closures in gravity.md; author path-scoped rules; define glossary terms for all normative vocabulary; set promises (including gateway cap).
3. **Projection:** run the WP3 generator; verify drift check clean.
4. **Stamp and ratify:** human reviews the full diff, sets `last_verified` to the current HEAD SHA on all five files, commits. Meta-Harness Restriction applies from this moment.

**Acceptance:** the workflow executed end-to-end on a fixture repo produces a valid, stamped manifold that WP2's guard can enforce and WP3's generator can project.

---

## 6. Deferred-tools register

Every canon-named tool not yet installed, with its class, seat, and trigger. Intake for any of these follows the standard procedure in Section 7. Status legend: **CORE** (canon-mandated, factory tier), **PILOT** (decision hook, not a mandate — never touches the manifold), **WATCH** (explicitly not adopted), **PROJECT** (per-product-repo dependency, not factory-installed), **SUPERSEDED** (ruling carried forward — do not install).

| Tool | Class | Canon seat / ruling | Status | Trigger to install |
|---|---|---|---|---|
| `pi-mcp-adapter` | Pi extension (MCP client) | v1.2 §2.11 client half | **CORE** (WP8) | WP0 API verification |
| Serena | MCP server (stdio) | Symbol-level editing; memory system permanently disabled; file/shell tools disabled at adapter (v1.2 §2.12, TCE §3.5) | **CORE** | First project needing symbol edits |
| GitNexus | MCP server + embedded LadybugDB | Graph-native code intelligence; **PolyForm Noncommercial license — commercial use requires paid license** (TCE §3.5) | **CORE, license-gated** | License decision OR bake-off resolution |
| CodeGraph | MCP server | Second graph engine (dual-engine law, v1.2 §2.12) | **CORE** | With GitNexus or as bake-off winner |
| codebase-memory-mcp | MCP server | Third bake-off candidate (TCE §3.5) | **PILOT** | Bake-off only |
| LadybugDB | Embedded library | GitNexus's embedded graph storage — **not separately installed** | (bundled) | With GitNexus |
| jCodeMunch | MCP server | **SUPERSEDED** — seat covered by Serena + dual graph engines (v1.2 §2.12) | **SUPERSEDED** | Never |
| Context7 | MCP server | External boundary federation — vendor-verified third-party docs (TCE §3.4) | **CORE** | First project with third-party API dependencies |
| Mintlify | CI pipeline | Internal syntax federation — auto-generated repo wiki/VFS (TCE §3.4) | **CORE, CI-tier** | Refinery (CI/CD) build-out |
| OpenWiki | CI pipeline | Mintlify challenger; instruction-file writer disabled during pilot (TCE §3.4) | **PILOT** | One-sprint bake-off vs Mintlify |
| QMD | CLI + Skill | INSTALLED 2.8.3; skill packaging is WP6 reference skill | **EXISTING + WP6** | — |
| LanceDB | Library | INSTALLED 0.37.1; manifold dedup hook (TMD_DEDUP_THRESHOLD 0.95) unwired | **EXISTING, hook pending** | WP3/CI wiring |
| BetterDB | Cache | Session-scoped prompt cache; exempt from Freshness Law; SESSION_CACHE_THRESHOLD (v1.2 §2.12) | **CORE, deferred** | Gateway-governed regime activation |
| Tokenjuice | tool_result middleware | Terminal-output compaction; `.tokenjuice/rules` committed; safe-inventory policy (raw file reads never reduced) | **PILOT→CORE** | Context-cost pressure measured on ledger |
| Headroom | MCP server (server mode only) | Non-terminal tool-payload compression; hard exclusion: .tmd/, contracts, must_haves, AGENTS.md never compressed; `headroom learn` permanently disabled (Meta-Harness violation) | **CORE, deferred** | With MCP stack |
| Ponytail | Vendored skill folder | Output-style governor; one per seat; trigger-loaded, never always-on | **CORE, deferred** | With skills library growth |
| Caveman | — | Telegraphic compression; rewrites instruction files (forbidden) | **WATCH** | Never in factory seats |
| Pulumi | IaC CLI | Infrastructure changes always route through it (Actuation Boundary) | **CORE, deferred** | First infrastructure-as-code need |
| LiteLLM gateway | Rig service | Gateway-governed regime; chargeback chain | **CORE, deferred** | Multi-provider / paid-API activation |
| herdr | TUI supervisor | Level-4 interactive supervision candidate; never concurrent with AMUX over same sessions (TCE §3.4) | **PILOT** | Operator time-to-intervention pilot |
| OpenSpec | Spec toolchain | Phase 1–3 lifecycle feeding contract generation; never writes into .tmd/ | **PILOT** | Contract-quality pilot |
| Daytona | Sandbox infra | Worktree mount injection (v1.2 §3.3) | **CORE, deferred** | Container-isolated worker spawn |
| Turborepo | Project dependency | Monorepo build orchestration — **product rig, not factory** | **PROJECT** | Per-repo decision |
| STATE.md | Pattern (not a tool) | Per-worktree working memory, E.2 schema | **WP9** | — |
| Zed + pi-acp | Editor + ACP bridge | Operator chat-plane candidate; ACP adapter bridging Pi RPC mode into Zed | **PILOT** | Operator UI evaluation vs integrated terminal |
| AionUI | Desktop GUI | Multi-agent GUI wrapper claiming Pi support | **PILOT, gate: inheritance test** | Must prove it launches the real `pi` binary and inherits `~/.pi/agent/extensions/` — bash-guard, file-changes, memory-toggle must all fire inside it before any real use |

**Register law:** a tool enters the active rig only through this register → intake procedure → manifest entry. Nothing lives in memory alone.

## 7. Standard tool intake procedure

Applied per tool when its register trigger fires (the same procedure used for every Step 7–11 component):

1. **Classify** — binary/CLI, MCP server, library, or pattern; factory-tier vs project-tier.
2. **Discover → pin** — latest official version discovered at install time; converted to exact pin + integrity hash; `--ignore-scripts`; no `curl|sh`.
3. **Isolate and smoke-test** — fixture under `~/factory-rig/validation/<tool>-smoke/`; adversarial/unverified installs run only inside disposable containers.
4. **Record** — `package-pins.json` + `rig.manifest.yaml` entries with `validated_at_utc`; commit; update the runbook and FACTORY_STATUS so the tool survives portability.
5. **License check** — record license class before any revenue-bearing use (GitNexus precedent).

## 8. Ratified decisions log (from the build conversation)

1. English only; platform Windows + WSL2 Ubuntu 24.04; full Factory Floor local, Hetzner remote deferred.
2. Kimi OAuth (subscription-governed regime) is the initial provider; Claude API / OpenRouter / Helicone documented as future paths only.
3. Source repo vs active clone: edit `~/factory-rig/sources/harness-config` → commit → push → pull into read-only `~/.pi/agent`.
4. TMD stays templated/inert during rig setup; project-level manifold is per-product-repo work.
5. Acceptance tag `factory-rig-v1.0.0` covers the **substrate only**, not the governance plane.
6. Templates must embed invariant law (three-zone contract) — ratified fix for the inert-template gap.
7. Canon handbooks are design documents, not runtime config; new machines need only `harness-config` (git clone preferred; USB/offline variant documented in PORTABILITY.md).
8. AMUX pinned commit has no Pi adapter (recognized harnesses: Claude Code, Codex, Gemini, Ollama); tmux is the AMUX backend; herdr not installed (pilot register).
9. PR-Agent runs report-only, provider-inactive, network-isolated.
10. The four final documents (FACTORY_STATUS, Fresh Project SOP, UPDATE_RUNBOOK, PORTABILITY) are written **after** the governance plane lands, so they document the finished rig.

## 9. Open decisions (require human ruling before or during build)

1. **Model-class mapping for profiles (WP5):** the roster's model classes (fast/cheap, frontier reasoner, task-matched, strong) need a concrete mapping under the single Kimi-subscription regime — initially all roles route to `kimi-for-coding` with effort-level differentiation only. Confirm.
2. **GitNexus license:** noncommercial-only use, procure commercial license, or run the three-way bake-off (TCE §3.5). Blocks the graph-engine seat.
3. **BetterDB / LiteLLM / gateway-tier tools** stay deferred until a gateway-governed (paid API) regime is activated. Confirm deferred.
4. **AMUX ↔ Pi adapter:** pinned AMUX does not recognize Pi. Options: upstream adapter contribution, config shim, or supervise Pi sessions via plain tmux until adapter exists. Recommend the last. Confirm.

## 10. Definition of done for the whole plane

The governance plane is complete when: WP0–WP10 acceptance criteria all pass; every L-law in Section 4 is enforced by at least one of planes 1–3 (a mapping table in the final PR); the deferred-tools register is committed and current; a fixture product repo onboards via WP10 and runs a scout/worker/reviewer cycle under profiles with the sandbox guard blocking a deliberate out-of-scope write; and the four final documents are regenerated against the finished rig. That state — not `factory-rig-v1.0.0` — is the tag candidate for `factory-rig-v2.0.0`.
