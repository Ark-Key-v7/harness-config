# CAPABILITY_REGISTER.md — what this rig can do, and what waits for its gate (WP11)

Three postures. **Integrated** = live today, with its surface and driver.
**STAGED** = installed-inert (see the install policy below). **Deferred** =
registered, with canon source, an explicit *activation trigger*,
prerequisites, and integration path. The deferred half answers
"when does this turn on?" — you never have to remember; the triggers below
are the memory. Machine-readable detection for the subset that is
filesystem-detectable lives in `docs/activation-triggers.json`, evaluated by
`bin/check-activations.mjs` at every project onboarding (and standalone).

**Install policy (WP-STACK, operator-ratified):** components install in one of
three postures. STAGED — free/OSS/credential-free: installed, pinned,
driver-smoked, inert until invoked; activation is seat wiring + skill
pointer, not installation. DEFERRED — money-gated (API-billed lanes),
infra-gated (hardware/hosting decisions), or canon-pilot-gated (swarms,
campaigns): not installed; the trigger below is the memory. Every component
landing — staged or deferred-activated — lands as ONE commit of four parts:
pin (package-pins.json) + install (with smoke driver) + seat wiring
(profile protocols allowlist, roster PR) + skill pointer (the skill that
uses the instrument names it). A tool without its four parts is an orphan;
an orphan is slop.

**Status legend (WP-STACK):** STAGED = installed, pinned, driver-smoked, inert until invoked (activation = seat wiring + skill pointer). Staged components live in `~/factory-rig/tools/` (binaries) and `templates/mcp-catalog.json` (MCP servers, lint-mcp curated).

Deferred integrations are NEVER autonomous (canon §6.4 Meta-Harness; §5.4):
the agent surfaces a fired trigger, the human ratifies via the rig-change
skill, a driver proves it, the chain lands it.

---

## Integrated capabilities

| Capability | What it does | Surface | Driver |
|---|---|---|---|
| Manifold templates (Zone A law / Zone B structure / Zone C slots) | The .tmd physical laws every project inherits | `templates/tmd/` ×5 + `templates/AGENTS.md` | `validation/tmd/` |
| Contract gate (E.1) | Validates filled task contracts; cross-checks sub_graph against the Registry | `bin/lint-contract.mjs` | `validation/contract/` |
| Scope resolution | sub_graph → gravity.md Registry → `.pi/scope.json` write-scope (fail-closed) | `bin/contract-scope.mjs` | `validation/contract/` |
| Sandbox guard | Blocks out-of-scope writes at the tool boundary | `extensions/sandbox-guard.ts` | outer `validation/` + `validation/sandbox-guard/` |
| Bash guard | Blocks forbidden command classes | `extensions/bash-guard.ts` | outer `validation/` |
| Ask-user bridge | Human-in-the-loop question channel | `extensions/ask-user.ts` | outer `validation/` |
| File-change tracking | Records actuator writes per session | `extensions/file-changes.ts` | outer `validation/` |
| Memory toggle | Operator-gated memory.md injection (8KB cap) | `extensions/memory-toggle.ts` | `validation/` |
| Seat switch | `/seat scout\|planner\|worker\|reviewer\|off` — profile injection, human-only (Meta-Harness), 16KB cap | `extensions/seat-switch.ts` | `validation/` |
| pi-acp command bridge | Slash commands in Zed: pi-acp filters extension-registered commands from ACP, so a native adapter patch (a) advertises pi's full command registry as `available_commands` and (b) dispatches unrecognized `/command args` to pi's own command handler, as the TUI does — generic successor to the retired per-command /seat patch (idempotent apply, legacy-backup migration, fail-closed on drift) | `patches/pi-acp-command-bridge.patch` + `patches/apply-pi-acp-command-bridge.sh` | `validation/pi-acp-patch-smoke/` |
| Sovereign profiles | scout / planner / worker / reviewer seat law | `templates/agents/profiles/` | `validation/profiles/` |
| MCP curation gate | Exact pins, stdio-default, deprecated-feature rejection | `bin/lint-mcp.mjs` | `validation/pi-layer/` |
| Project onboarding | Phase-1 scaffold + self-lint + activation notices + CONSTRAINTS.md quality-bar seeding (WP-D-3) | `bin/onboard-project.mjs` + `skills/project-onboard/` + `templates/CONSTRAINTS.md` | `validation/onboard/` |
| Refinery Stage 0 (local pre-flight) | Semgrep injection floor + contract lane before commit (WP11) | `bin/preflight.mjs` + `templates/semgrep/base.yml` | `validation/refinery-lane/` |
| Activation detector | Surfaces fired deferred-register triggers (WP11) | `bin/check-activations.mjs` + `docs/activation-triggers.json` | `validation/refinery-lane/` |
| State spine (E.2) | STATE.md schema, genesis, dual failure vocabulary, wt.toml hook contract | `templates/agents/schemas/state.schema.yaml`, `bin/state-genesis.mjs`, `bin/lint-state.mjs`, `bin/lint-wt-hook.mjs` | `validation/state-hook/` |
| Projection engine | Templates → harness projections, input-head freshness law | `bin/generate-projections.mjs`, `bin/assert-projection-fresh.mjs`, `bin/check-projections.mjs` | `validation/projections/` |
| Manifold linter | Header law (last_verified = SHA), Zone discipline, template/strict modes | `bin/lint-tmd.mjs` | `validation/tmd/` |
| Profile linter | Sovereign profile format law (incl. substitution_bounds) | `bin/lint-profiles.mjs` | `validation/profiles/` |
| Skill linter | SKILL.md format gate (E.6 frontmatter + format v2.0.0: metadata.class, When NOT to Use, no empty folders) | `bin/lint-skills.mjs` | `validation/skills/` |
| Skills (global, post-v2.1; format v2.0.0) | rig-change · pr-review · tool-intake · template-skill · project-onboard · spec-intake · slice-plan · ship-gate (rig-native, WP-D-6 §7) · webperf-audit · rules-drift-check · to-questionnaire (procedural) · test-driven-development · verification-before-completion · systematic-debugging · brainstorming (discipline class, WP-D2 ports) · ui-engineering · performance-optimization · interview-me · context-budget (discipline class, WP-D-3 agent-skills ports; template-skill v2.0.0 is the two-class wireframe; WP-D-4 ports: rules-drift-check, to-questionnaire) · api-and-interface-design · security-and-hardening · observability-and-instrumentation · documentation-and-adrs (discipline class, WP-D-6 §3 promotions) · browser-testing-with-devtools (procedural, WP-D-6 §3.5 — actuation gated at §D.24) | repo-root `skills/` | `validation/skills/` |
| Supply-chain floor (canon §6.6 M2/M3) | --ignore-scripts, exact pins, frozen lockfiles | `package-pins.json` + runbook gates | `validation/pi-layer/` |
| Outer machine floor | semgrep, pr-agent tool installs + smoke fixtures (machine-local, not the repo) | `~/factory-rig/tools/` | outer `validation/` |
| Spec chain linter (Phase 0) | Schema + back-reference/orphan check + provenance headers for specs/intent, prd, plans | `bin/lint-spec.mjs` + `templates/specs/` | `validation/spec-smoke/` |
| Doctor (autonomy evidence gate) | Deterministic checklist; `max_level()` from FAIL rows; blocks dial elevation | `bin/doctor.mjs` + `.agents/autonomy.json` schema | `validation/doctor-smoke/` |
| Floor ratchet | Monotonic gate thresholds, `_MAX` ceilings, slack reporting | `bin/floor-ratchet.mjs` + project `.agents/floor.json` | `validation/floor-smoke/` |
| Guard (Gate Integrity §5.10.1) | Protected-list write boundary, fail-closed, list in code | `extensions/guard.ts` + `bin/guard.mjs` (CI) + `bin/guard-list.mjs` (the list — single source) | `validation/guard-smoke/` |
| Tripwire (holdout leak) | Provenance-based detection: holdout-shaped content in worker artifacts | `bin/tripwire.mjs` | `validation/tripwire-smoke/` |
| Mutation lane (§5.10.4) | Deliberate defects spanning every gate rung must be caught | `validation/mutations/` | self (runbook suite loop) |
| Deterministic proof floor (L0) | Scoped rg verifies index/edit claims before action or merge | package-pins.json + floor install | outer validation/ |
| Canon Compiler (document gate) | templates parse/render/reference checks, stale-term rejection | bin/canon-compile.mjs | validation/canon-compile/ |
| Change semantics (living specs + delta merge) | specs/domains + specs/changes + archive machinery | templates/specs/{domain-spec,delta}.md + bin/archive-change.mjs | validation/spec-smoke/ |
| Skills (Phase 0) | `spec-intake` v2.0.0 (intent→PRD interview) · `slice-plan` v2.0.0 (plan→slices→contracts) — both rebuilt WP-T; `templates/specs/` ×3 enriched same WP; canon handbook Appendix 2.A reconciliation PENDING (operator action) | repo-root `skills/` | `validation/skills/` |

*Status note (canon revision 2026-09, updated at WP-C landing):* the seven
rows above were recorded specified-not-yet-landed at the canon revision.
Landed since: spec chain linter + templates (WP-A), skills `spec-intake`/
`slice-plan` (WP-A), doctor + autonomy.json schema (WP-B), pr-review
strengthening (WP-B), guard + guard-list + CI twin (WP-C), floor ratchet
(WP-C), tripwire (WP-C), mutation lane (WP-C), state vocabulary
`needs_human`/`holdout_leak` (WP-C). Remaining deferrals: §D.19 queue
machinery (trigger: first dial-2 request), §D.20/§D.21 (life events).

---

## Deferred register

Canon references use the handbook's own section numbers. "Trigger" is the
observable condition that makes the item activatable — not a suggestion.

### §D.1 (Refinery) Refinery pipeline machinery (Stages 1–3 core, merge queue, CD handoff)
- **Canon:** CI/CD Integration Engine §2.3–§2.8; §7.1 Phase 3.
- **Includes:** Stage-1 CI gates (Fallow, ESLint, tsc, bun test); merge queue (batch-then-bisect, pairwise-conflict serialization); Worktrunk adoption (wt.toml leaves the inert register); **cross-worker collision guards (v1.2 §4.4 — pre-ship warning when a worker writes a file another in-flight worker has read; implementation site: the Worktrunk hook layer or a rig service watching worktree state)**; PR-Agent Stage-2 container; CodeQL weekly lane; Stage-4 SLA/auto-merge mechanics; Vercel/Coolify CD routing. Turborepo (per-project CI dependency — lands with the workflow templates, never machine-floor).
- **Activation trigger:** the FIRST product repository completes onboarding (auto-detected: `check-activations` T1). PR-Agent specifically also requires §D.10 (gateway) — on the subscription regime it has no API lane until then.
- **Prerequisites:** product repo on the SCM hub; Stage-0 lane green locally; runner hardware decision (Blacksmith.sh Phase 1 vs Hetzner+Coolify Phase 2).
- **Integration path:** rig-change WP → GitHub Actions workflow templates added to `templates/` (projected into products at onboard) → dogfood on the product repo.

Reason class (WP-STACK §2.1): infra-gated (runner hardware decision).

### §D.2 (Refinery) Execution sandbox (Daytona / rootless Podman dev-container quarantine)
- **Canon:** §6.6 Mandate 1; §6.2 execution boundary; Stage 0 runs INSIDE it.
- **Activation trigger:** first product repo (with §D.1) — canon wants preflight confined, not on the host.
- **Prerequisites:** Daytona install on WSL2; container image pins.
- **Integration path:** wt.toml `mount` hook becomes live; preflight gains `--container` mode.

Reason class (WP-STACK §2.1): infra-gated (WSL2/image decisions).

### §D.3 Convex-dependent lanes (Stage-3 E2E ephemeral previews; schema pipeline)
- **Canon:** §2.6; §6.2 Convex Mandate; §7.1 Phase 3 (Midscene against preview).
- **Activation trigger:** a governed project contains `convex/` (auto-detected: T3). Until then the Mandate rides as an activation notice + promises.md Zone C entries.
- **Prerequisites:** Convex OSS preview deployments; Playwright baseline suite; Midscene pilot budget.
- **Integration path:** per-project CI lane; circuit breaker config as committed config-as-code.

### §D.4 Brownfield archaeology stack
- **Canon:** §7.2 (GitNexus AST maps, jCodeMunch MCP extraction, AMUX read-only swarm, artifact hierarchy).
- **Activation trigger:** operator declares a brownfield target (`--brownfield` at onboarding; auto-detected: T2).
- **Prerequisites:** GitNexus PolyForm Noncommercial license decision (graph seat CLOSED by canon ruling 7: codebase-memory-mcp is the engine of record, register §D.25; GitNexus out on license, CodeGraph out — this entry's archaeology scope is now jCodeMunch MCP + AMUX swarm only); AMUX↔Pi adapter boundary (open decision).
- **Integration path:** tool-intake WP per tool; swarm SOP into FRESH_PROJECT_SOP.

### §D.5 Lavish A2UI review surface
- **Canon:** Constraint-Driven Lifecycle Phase 2 (lavish-axi, local-first); Stage 4 Vibe Diff.
- **Activation trigger:** the first Phase-2 manifold review on a real project (auto-detected: T4 notice at every onboarding).
- **Prerequisites:** lavish-axi CLI install; local-first serving check.
- **Integration path:** tool-intake WP; project-onboard Step 3 gains the visual loop.

### §D.6 (L7) Betterleaks secrets lane
- **Canon:** §6.3 ("the local agent must execute … Betterleaks" before commit).
- **Status note:** the binary is present on the machine and preflight lane 3
  runs it (dialect-probed: git/detect/scan verb from --help). Findings BLOCK;
  an unrecognized CLI dialect degrades to WARN, never a silent skip.
- **Activation trigger:** closing — the lane went active with WP11; this entry
  retires to the integrated table once the remaining work lands.
- **Prerequisites:** none (binary installed).
- **Integration path:** pin the version in `package-pins.json`; if the
  dialect WARN ever appears, a small intake WP pins the correct verb.

### §D.7 Constraint-as-Code indexing machinery
- **Canon:** §2.5 (LanceDB semantic dedup at TMD_DEDUP_THRESHOLD 0.95 with halt + Deduplication PR; commit-triggered re-indexing cadences for QMD / code-graph / LanceDB); §2.9 evaluation flywheel (turns/cost to converge).
- **Activation trigger:** manifold debt — the first time a `.tmd/` edit duplicates an existing constraint, OR the first product repo reaches 5+ governed contracts (whichever first; human-judged, register-reviewed at each rig change).
- **Prerequisites:** LanceDB + embedding model decision; trace-ledger existence (§D.12).
- **Integration path:** new bin/ indexer + commit hook; reuse the projection freshness lockstep pattern (generator + assert in lockstep).

### §D.8 (L6) Token-economy adjuncts (Headroom, Ponytail, Tokenjuice; BetterDB cache; Caveman WATCH)
- **Canon:** §6.4 adjunct list with seat law; §6.5 BetterDB session cache (SESSION_CACHE_THRESHOLD 0.95).
- **Activation trigger:** token pain — sustained context-pressure on real tasks (operator-judged); BetterDB specifically when redundant-query loops show up in debugging sessions.
- **Prerequisites:** per-tool intake (Headroom: MCP-server mode only, compression exclusions preconfigured; Ponytail: vendored as Sovereign Skill Protocol folders; Tokenjuice: pilot with fixture-regressed rules; Caveman stays WATCH).
- **Integration path:** tool-intake WP per tool; never wrap/proxy modes (chargeback-chain law).

Nine-layer update (WP-C2): this entry IS layer L6 — Headroom MCP-server mode only, Tokenjuice terminal-output pilot. Ponytail stays in this entry as vendored skill folders. Caveman stays WATCH (canon ruling 5: unverifiable products do not enter the stack).

### §D.9 (L8) Stage-3.5 pilots (Strix agentic pentest; Claw Patrol egress firewall)
- **Canon:** §2.6.5 — both pilot-gated by canon itself (scheduled-only pentest; mechanical allow/deny only, llm_approver forbidden).
- **Activation trigger:** §D.3 live (Strix needs the ephemeral preview) and first high-privilege agent seat (Claw Patrol).
- **Prerequisites:** LiteLLM budget ceiling (§D.10); Tailscale mesh (§D.11) for Claw Patrol.
- **Integration path:** one-month pilots with canon-stated success criteria; CI fixture regression for firewall policy.

Reason class (WP-STACK §2.1): canon-pilot-gated (scheduled campaigns; need deployed product + previews).

### §D.10 LiteLLM gateway + FinOps gateway regime
- **Canon:** §6.4 (retries vs fallbacks, circuit breakers, X-LiteLLM-Trace-Id chargeback; one gateway owns the API-billed lane).
- **Activation trigger:** adoption of the FIRST API-billed engine (any non-subscription model seat). Not auto-detectable — a life event (see OPERATOR_GUIDE).
- **Prerequisites:** Docker + Coolify host (local Phase 1 or Hetzner Phase 2); API keys; budget ceilings per seat.
- **Integration path:** STATE.md `finops.regime` flips per contract; PR-Agent (§D.1) unblocks. Rides along: two-part cache-aware prompt composition (v1.2 §2.4 — stable/dynamic split with `cache_control: ephemeral` on the stable block; projections already implement the split, so gateway adoption only adds the request structuring).

Reason class (WP-STACK §2.1): money-gated (first API-billed engine).

### §D.11 Hetzner production perimeter
- **Canon:** §6.1 (Tailscale mesh, UFW 80/443 only, CrowdSec at Traefik, Let's Encrypt).
- **Activation trigger:** the local→Hetzner migration decision (§1.1) — a life event, not auto-detectable.
- **Prerequisites:** Hetzner bare metal; Coolify; the Migration Runbook doubles as the build sheet.
- **Integration path:** infra WP; Claw Patrol/Strix lanes (§D.9) become deployable.

Reason class (WP-STACK §2.1): infra-gated.

### §D.12 State Survival machinery (ledger replication, rig-rebuild runbook)
- **Canon:** §6.7 (Litestream off-rig replication; corruption recovery; rebuild-by-script).
- **Activation trigger:** the moment `trace-ledger.sqlite` first exists (i.e., with §D.7/D.10 telemetry) — zero-durability state is an unpriced risk from that instant.
- **Prerequisites:** object storage target; WAL snapshots schedule.
- **Integration path:** harness config only — never the manifold (canon: backup is factory machinery).

Reason class (WP-STACK §2.1): infra-gated.

### §D.13 (L1/L4-public) Curated MCP stack + pi-mcp-adapter
- **Canon:** v1.2 §2.11 curation rulings; MCP 2026-07-28 alignment (§6.4 Protocol Alignment).
- **Status note:** `pi-mcp-adapter` is PINNED, pending install; Serena/Context7 activate on first need.
- **Activation trigger:** first task needing LSP-grade navigation (Serena) or library docs (Context7) — agent-judged, surfaced via tool-intake.
- **Integration path:** install adapter → curate servers through `lint-mcp.mjs` → project `.mcp.json`.

Context7 is L4-public in the nine-layer stack; QMD (L4-private) lives in §D.25 — jurisdictions never merge.

**STAGED components (WP-STACK, four parts each):** Serena 1.7.0 (L1 — pin ✓
package-pins.json, install ✓ tools/serena venv, smoke ✓ stack-staging driver,
pointer ✓ worker profile + catalog entry `serena`); Context7 4.1.1 (L4-public —
pin ✓, install ✓ tools/context7, smoke ✓, pointer ✓ context-budget +
catalog entry `context7`). Status: these components **STAGED** (installed-
inert); the §D.13 curated-stack entry stays DEFERRED until seat wiring lands
via roster PR.

### §D.14 AsyncReview — the Stage-0 semantic pass (third local tool)
- **Canon:** CI/CD Integration Engine §2.3 — "The agent must trigger
  AsyncReview, Semgrep, and Betterleaks locally"; AsyncReview "runs against
  the active worktree to catch semantic drift and logical errors in
  isolation." Semgrep + Betterleaks lanes are LIVE (WP11); this lane is not.
- **Intake findings (tool-intake, 2026-08):** AsyncReview (AsyncFuncAI, MIT)
  is an agentic RLM reviewer driven via `npx asyncreview review --url
  <github-pr>`; its engine is the Gemini API (`GEMINI_API_KEY` required) and
  it verifies findings in a recursive Python REPL sandbox. Two consequences:
  (1) it is an API-billed engine — adopting it fires the §D.10 life event,
  and recursive reviewers are exactly the cost-explosion class §6.4's
  circuit breaker exists for, so no un-gated Gemini key; (2) its shipped
  interface reviews GitHub PRs by URL, not a local worktree — canon's
  Stage-0-local phrasing needs a wrapper or a ratified adaptation.
- **Activation trigger:** §D.10 gateway adoption (first API-billed engine),
  OR ratification of the subscription-governed alternative below.
- **Prerequisites:** exact npx pin (`--ignore-scripts`, `package-pins.json`
  entry); gateway budget ceiling; container confinement (§6.6 Mandate 1 —
  the tool executes code); GITHUB_TOKEN scoping for private repos.
- **Integration path:** intake WP → preflight gains lane 4 (`--semantic`).
  Ratified alternative on the table: the capability is law, not the vendor —
  the reviewer seat (pr-review skill, subscription-governed engine) can hold
  the Stage-0 semantic seat until AsyncReview clears its gates. Record the
  decision here when made.

### §D.15 Trace ledger — the observability spine
- **Canon:** v1.2 §5.7 (observability), §1.3 (MANIFOLD_CONFLICT events), §3.7 (KPI calibration source), §4.4 (failure lineage); v1.0 §4.3 (execution ledger, SQLite WAL).
- **Status note:** this entry owns the ledger. §D.7 and §D.12 reference it as a prerequisite; until it exists, Conflict-Halt events and KPI calibration have no durable sink, and §D.12's trigger cannot fire.
- **Activation trigger:** the first MANIFOLD_CONFLICT or budget_severance event needs a durable sink, OR §D.7/§D.10 telemetry activates — whichever first (human-judged at the event).
- **Prerequisites:** event-taxonomy schema decision; `extensions/file-changes.ts` (integrated) is the bootstrap substrate for write-side records.
- **Integration path:** schema into `templates/agents/schemas/`; a ledger-writer extension (`tool_result`/`pi.appendEntry` surface); driver under `validation/`. Landing this flips §D.12's activation trigger live.

### §D.16 In-harness loop health (doom-loop fingerprinting, state-aware rollback, reminder caps)
- **Canon:** v1.2 §4.4 (MD5 fingerprint of consecutive actions, 3-in-20 window; output loop detector; reminder caps MAX_TODO_NUDGES=2 / MAX_NUDGE_ATTEMPTS=3), §3.10 (snapshot at tool_call preflight for mutating tools; restore-to-last-green on escalation), §1.5 (doom loops are detectable, not mysterious).
- **Status note:** no gateway, Worktrunk, or ledger hard dependency — implementable on the subscription regime today; escalation events degrade to STATE.md `failure_class` until §D.15 lands.
- **Activation trigger:** the first unattended (daemon-driven, non-TUI) worker session, OR a doom loop observed in a session/file-changes record — agent-judged, surfaced via tool-intake.
- **Prerequisites:** `extensions/file-changes.ts` (integrated — the snapshot/undo substrate).
- **Integration path:** one extension (`loop-guard`) on the `tool_call` surface + restore path reusing file-changes undo; driver under `validation/` proving fingerprint-fire and restore-to-green.

### §D.17 Pi-native sub-agent topology (validation-gated)
- **Canon:** v1.2 §4.3 — specified-but-not-ratified until the build-and-validate gate passes: spawn an orchestrator and two workers on one repository, separate branches, each under contract and sandbox; require clean payload return, correct trace lineage, zero cross-worker write collisions.
- **Activation trigger:** a task class demands delegation beyond `/seat` switching (single-rig parallel throughput) — human-judged; entangled with the AMUX↔Pi adapter open decision (FACTORY_STATUS §9).
- **Prerequisites:** §D.15 (trace lineage); per-worker sandbox scopes (integrated: sandbox-guard + contract-scope).
- **Integration path:** run the canon validation gate as its own WP; until it passes, no mechanism may presume the topology (canon's own conditional).

Reason class (WP-STACK §2.1): canon-pilot-gated (validation experiment).

### §D.18 Trigger-plane prompt templates (meta-prompts, ADWs, HOP)
- **Canon:** v1.2 §4.2 (meta-prompts, ADWs, the HOP — the dispatch decision is never automated), §3.5 (the promotion path: spec → template → workflow, climb on evidence), §1.6 (specs are durable assets).
- **Activation trigger:** a spec prompt has executed 3+ times unchanged on real tasks (promotion evidence per §3.5) — operator-judged.
- **Prerequisites:** none structural; `templates/pi/` currently holds only `settings.json` — this entry is its prompt-template tenant.
- **Integration path:** promote via tool-intake into `templates/pi/` prompt templates or a `skills/` folder; the HOP stays human (§5.4).

### §D.19 Queue Operations machinery (watchdog, scheduling, escalation routing)
- **Canon:** Harness v1.3 §4.7 (dispatch priority, size caps, fix attempts ≤2,
  escalation state machine, watchdog D1–D6); §5.6 dial interlock (no dial ≥2
  without watchdog); ZTE-class dial headroom (>3) recorded here as deferred.
- **Activation trigger:** the FIRST dial-2 elevation request on any governed
  project (doctor blocks the request until this entry is live).
- **Prerequisites:** §D.16 (in-harness loop-guard — per-session instance);
  STATE.md failure_class sinks (integrated) until §D.15 ledger.
- **Integration path:** `bin/watchdog.mjs` (pure assess function over STATE.md
  + file-change records) + escalation writer (needs_human.md + STATE.md
  record) + validation driver; queue config in committed `.agents/queue.json`.

### §D.20 Production loop closure (Stage 6)
- **Canon:** Harness v1.3 §5.8 ruling 4 — deterministic bands monitor; breach
  emits draft specs/intent/ artifact (TCE v2.1 Phase 0).
- **Activation trigger:** first deployed product with observability (life
  event, like §D.10 — not auto-detectable).
- **Prerequisites:** deployed product; monitor threshold config (committed);
  Phase-0 chain live (§D.22).
- **Integration path:** monitor config template + breach→intent draft writer;
  incident records (manual loop) are the interim posture.

### §D.21 Continuous agent-config evals
- **Canon:** Harness v1.3 §5.8 ruling 5 — profiles/prompts/skills eval'd in CI
  like code; holdout scenarios are the fixture substrate.
- **Activation trigger:** §D.15 ledger live AND holdout suites exist on a
  governed project. Trigger T5 (filesystem-detectable: `.agents/tasks/*.holdout.md`
  present) is **deferred** — `bin/check-activations.mjs` has no glob check
  type; T5 lands with the machinery WP that adds it (WP-A/WP-C), not with a
  docs commit. NOTE (WP-D-6 §8.4): trigger id T5 is now taken by the
  skill-shelf reminder; when this machinery WP lands its glob check, that
  trigger must take id T6.
- **Prerequisites:** §D.15; §D.22 (holdout machinery).
- **Integration path:** eval runner in validation/; scores to ledger; ratchet
  via §5.10.2 floor semantics.

### §D.30 Final skill shelf (WP-D-4 final disposition)

Disposition of every remaining candidate across the four source repos
(superpowers WP-D-2, agent-skills WP-D-3, cole/matt WP-D-4). Verdicts are
final (L5 — nothing here is re-evaluated; new candidates route through the
standing rule below).

- **Canon:** WP-D-4 build spec §5 — the four-repo adoption program's
  disposition table; closes WP-D.
- **Activation trigger:** NONE for this entry (disposition record). The
  `adopt-on-trigger` rows carry their own trigger: a slice's must_haves
  first demanding the domain.
- **Prerequisites:** template-skill v2.0.0 (IMPORT MODE + bake-off
  protocol) — the import protocol is the gate, no re-audit needed.
- **Integration path:** n/a — this entry is the record; candidate imports
  land via rig-change, one skill per commit.

| Item | Verdict | Reason |
|---|---|---|
| superpowers dispatching-parallel-agents, subagent-driven-development | SHELVED | orchestration concern; revisit with Archon (§D.23) evaluation |
| superpowers using-git-worktrees | SHELVED | worktrunk (§D.1) holds the workspace seat, installed-inert |
| superpowers finishing-a-development-branch | SHELVED | pr-review + ship flow covers it |
| superpowers using-superpowers, .pi/extensions/superpowers.ts | REJECTED | bootstrap injector duplicates seat law (WP-D-2 ruling) |
| agent-skills spec-driven-development, test-driven-development, debugging-and-error-recovery, constraint-driven-development, planning-and-task-breakdown, idea-refine | HARVESTED/REJECTED | per WP-D-3 §3 bake-off verdicts (recorded in §D.29) |
| agent-skills commands/*.toml (/spec /plan /build /test /review /ship) | REJECTED | harness slash-command layer; the rig's stage pipeline already binds these |
| agent-skills agents/code-reviewer, security-auditor, test-engineer | SHELVED | persona shells; their review criteria live in the skills already adopted |
| agent-skills api-and-interface-design, security-and-hardening, observability-and-instrumentation, documentation-and-adrs, browser-testing-with-devtools | ADOPTED | WP-D-6 §3 — verbatim + enumerated edits; chrome-devtools MCP gated at §D.24 |
| agent-skills ci-cd-and-automation, shipping-and-launch | HARVESTED | bake-off losers to the rig-native ship-gate skill (WP-D-6 §7); verbatim harvests with provenance |
| agent-skills remaining skills (code-review-and-quality, code-simplification, deprecation-and-migration, doubt-driven-development, git-workflow-and-versioning, incremental-implementation, source-driven-development, using-agent-skills) | SHELVED adopt-on-trigger | unchanged — Import Mode from `_intake/agent-skills/`; using-agent-skills' Core Operating Behaviors already harvested as roster law (WP-D-6 §6) |
| cole rules-check-drift, plan-create-prd, plan-create-stories, prime-* | RESOLVED | adopted/harvested in WP-D-4 (§3–§4 of the WP-D-4 spec) |
| cole piv-* family (14 skills), plan-architecture, rules-create-global, hooks-create, worktree-create | REJECTED | Claude-Code-specific pipeline (PIV loop, hooks, worktrees); superseded by the rig's own stage pipeline and worktrunk |
| cole build-dark-factory, system-evolution-review, system-execution-report, opportunity-scan, second-brain-audit, setup-ai-tutor, ablate-ai-layer, agent-browser, ast-grep | SHELVED adopt-on-trigger | dark-factory only via Archon evaluation §D.23; ast-grep via semgrep seat bake-off if ever needed |
| matt grilling, grill-me, grill-with-docs, to-spec, diagnosing-bugs, to-questionnaire, writing-for-agents | RESOLVED | adopted/harvested in WP-D-4 (§3–§4 of the WP-D-4 spec) |
| matt tdd, code-review, implement, prototype, triage, to-tickets, handoff, wayfinder, teach, codebase-design, domain-modeling, improve-codebase-architecture, research, wizard, ask-matt, setup-matt-pocock-skills, misc/*, in-progress/* | SHELVED adopt-on-trigger | same import-mode gate; in-progress/* additionally flagged: unfinished upstream, import only after re-checking upstream status |

| OpenSpec CLI (@fission-ai/openspec): openspec init, /opsx:* commands, profiles, custom schemas | REJECTED | harness glue / second invocation plane (agent-skills commands ruling); its change semantics (living specs, deltas, archive merge) adopted rig-native in WP-E. The CLI is never installed — the merger is bin/archive-change.mjs |
**Standing rule:** any future skill candidate from any source goes through
template-skill Import Mode with a bake-off against the seat incumbent. The
shelf is a disposition record, not a to-do list.

### §D.28 Brainstorming visual companion (shelved at WP-D-2 adoption)
- **Sources location:** all shelved source material lives as SHA-pinned clones under `~/factory-rig/sources/_intake/<repo>/` (agent-skills @ 48cb1168, superpowers @ b36e082, cole @ fb2e876, matt @ 3cca18b). The register is the disposition record (git); `_intake/` is the physical shelf (machine state); adoption is Import Mode from the pinned clone, never a fresh fetch.
- **Canon:** WP-D-2 adoption record — the brainstorming skill was ported
  from obra/superpowers (local clone, SHA b36e082) with its Visual
  Companion section EXCLUDED: the companion is a browser-server tool that
  needs its own tooling decision (server process, security boundary, ACP
  interplay, token cost) before it may enter the rig.
- **Activation trigger:** operator ratifies a visual-companion tooling WP.
- **Prerequisites:** tooling decision + smoke driver + L12 pin review of
  the companion server.
- **Integration path:** re-adopt `visual-companion.md` from the local
  superpowers clone into `skills/brainstorming/` via template-skill
  IMPORT MODE (transformation-spec method, WP-D build spec).

### §D.29 Agent-skills candidate shelf (WP-D-3 disposition record)
- **Canon:** WP-D-3 bake-off verdicts — recorded so no item is re-evaluated
  later (L5). Source: addyosmani/agent-skills @ 48cb116 (intake clone pinned
  to the spec's reference SHA; HEAD drift on context-engineering reported at
  landing).
- **ADOPTED (verbatim + enumerated edits):** `frontend-ui-engineering` →
  `skills/ui-engineering/` (renamed per §2 naming note); `performance-optimization`
  → `skills/performance-optimization/`; `interview-me` → `skills/interview-me/`;
  `context-engineering` → `skills/context-budget/` (renamed: states what it
  governs, avoids TCE "context" collision); `agents/web-performance-auditor.md`
  → `skills/webperf-audit/` (agent→skill port, framing only).
- **HARVESTED (not adopted standalone):**
  - `idea-refine` → spec-intake divergent-refinement step + Step 0 intent
    clarity gate (§6.2).
  - using-agent-skills → roster-laws.md six Core Operating Behaviors (WP-D-6 §6); the skill itself stays REJECTED (second invocation plane).
  - `debugging-and-error-recovery` → systematic-debugging: Stop-the-Line Rule,
    non-reproducible decision tree, untrusted-error-output section (§6.3).
  - `planning-and-task-breakdown` + superpowers `writing-plans`/`executing-plans`
    → slice-plan `references/task-quality.md` + task quality gate (§6.4).
  - superpowers `requesting-code-review`/`receiving-code-review` → pr-review
    dispatch + reception rules (§6.5).
  - `constraint-driven-development` → guard-the-bar five diff checks in
    `bin/guard.mjs` (§6.1), `templates/CONSTRAINTS.md` (§5.1), worker seat
    floor rules (§6.6).
- **BAKE-OFF LOSERS (rig keeps the seat it already holds):**
  - `test-driven-development` (agent-skills, 398 lines) — superpowers TDD port
    (WP-D-2) wins; no harvest (stack discovery already covered by
    project-onboard Step 0).
  - `spec-driven-development` — spec-intake + slice-plan hold the seat;
    capability-map harvest designated for WP-E.
- **Remaining source material (commands/*.toml, other agents, unused skills):**
  stays in `_intake/agent-skills/` only; disposition recorded here so it is
  never re-audited from scratch.
- **Activation trigger:** NONE — this entry is the disposition record (WP-D-3
  §8: no new triggers; adopted skills fire on their description triggers,
  discipline skills fire seat-bound). Closes on WP-D-4 shelf finalization.
- **Integration path:** n/a — this entry is the disposition record; WP-D-4
  handles cole/matt salvage and shelf finalization.

### §D.22 Phase-0 spec chain machinery — CLOSED (WP-A–C landed 2026-09)
- **Canon:** TCE v2.1 §2.A (intent→PRD→plan→slice→contract; orphan lint;
  provenance headers); Harness v1.3 E.1 holdout extension.
- **Includes:** `templates/specs/` scaffold; `bin/lint-spec.mjs`; contract
  `trace:` field enforcement in `bin/lint-contract.mjs`; holdout read-deny in
  `bin/contract-scope.mjs`; skills `spec-intake` + `slice-plan`;
  `bin/onboard-project.mjs` scaffolding + final doctor run.
- **Activation trigger:** NONE — ratified for immediate build (WP-A). This
  entry exists for bookkeeping completeness and closes on landing; it is the
  canon-revision classification record for TCE v2.1.
- **Integration path:** WP-A per FACTORY_STATUS — templates/specs →
  lint-spec → contract `trace:` → holdout template + contract-scope
  read-deny → skills spec-intake/slice-plan → onboard scaffolding. Driver:
  validation/spec-smoke + contract driver extension.

---

*Maintenance rule: any status flip (deferred → pilot → live) updates this
register AND docs/CANON_MAP.md in the same commit. Trigger IDs referenced by
docs/activation-triggers.json are driver-checked — a register entry without
its trigger line fails validation/canon-register.*

### §D.23 Archon orchestration evaluation
- **Canon:** referenced by §D.30 (dispatching/subagent orchestration shelf
  rows) and CANON_MAP L-seat notes — the deferred seat for evaluating Archon
  (or an equivalent orchestration substrate) before any dispatch-style
  orchestration skill may leave the shelf.
- **Activation trigger:** a governed project's slices demand parallel
  sub-agent dispatch — human-judged, surfaced via tool-intake.
- **Prerequisites:** §D.17 (Pi-native sub-agent topology) validation first —
  native topology may hold the seat without Archon.
- **Integration path:** tool-intake WP → bake-off vs the native topology →
  adopt or record the loser verdict in §D.30.

### §D.24 Chrome DevTools MCP (browser-testing-with-devtools actuation)
- **Canon:** WP-D-6 §3.5 — the skill is adopted law today; its power source is not.
- **Activation trigger:** the first governed project with a browser-facing
  slice (web UI in the stack) — agent-judged, surfaced via tool-intake.
- **Prerequisites:** curation through `bin/lint-mcp.mjs` (exact pin,
  `--ignore-scripts`, stdio-default); the skill's profile-isolation rules
  (`--isolated` default; never the operator's daily Chrome profile) are the
  adoption contract, verbatim.
- **Integration path:** tool-intake WP → `.mcp.json` entry per project →
  worker seat `protocols.mcp_servers` gains `chrome-devtools` via roster PR
  (§5.4). Skill scripts and JS-execution stay read-only per the skill's own
  security boundaries.

### §D.25 (L2/L3/L4-private/L5) Truth, Retrieval & Publish stack (codebase-memory-mcp, OpenWiki+OpenKB, QMD, Docs7 XOR Docusaurus)
- **Canon:** nine-layer stack L2/L3/L4/L5; Standing Rulings 7–8.
- **Includes:** codebase-memory-mcp as graph engine of record (MIT,
  no-self-write binding; LadybugDB rides inside it as the embedded graph
  store — not a separate adoption); Graft standby only; OpenWiki + OpenKB
  documentation substrate; QMD private retrieval (Context7 stays §D.13);
  Docs7 XOR Docusaurus publisher (one publisher per docs property).
- **Activation trigger:** first governed product repo completes onboarding
  AND a slice's must_haves require blast-radius navigation or committed
  documentation retrieval — human-judged, surfaced via tool-intake.
- **Prerequisites:** per-tool intake via tool-intake WP; one active map per
  repo (one repo, one index); L12 pins via lint-mcp for any MCP surfaces.
- **Integration path:** tool-intake per component; worker seat
  `protocols.mcp_servers` entries via roster PR (§5.4). GitNexus (license)
  and CodeGraph are CLOSED — ruling 7; never re-litigated.

**STAGED components (WP-STACK, four parts each):** codebase-memory-mcp 0.11.0
(L2 — pin ✓, install ✓ tools/codebase-memory-mcp, smoke ✓ stack-staging
driver, pointer ✓ systematic-debugging + catalog entry `codebase-memory`);
OpenWiki 0.5.2 + OpenKB 1.0.22 (L3 — pin ✓, install ✓, smoke ✓, pointer ✓
documentation-and-adrs rig bindings); QMD 0.1.2 (L4-private — pin ✓, install ✓
tools/qmd venv, smoke ✓ CLI-level only: the index roundtrip downloads a
~600M-param embedding model from HF Hub at first use — that cost is paid at
ACTIVATION; pointer ✓ context-budget). Docs7 XOR Docusaurus (L5) stays
project-time — a publisher is chosen per docs property, not per machine.
Status: these components **STAGED**; the §D.25 entry stays DEFERRED until
activation. Graft stays unstaged — a standby is evaluated only on measured
friction with the primary (ruling 7); staging a standby is speculative.

### §D.26 (L7) L7 gate stack completion (DeepSource primary, open-code-review, VulnHuntr, CodeRabbit WATCH)
- **Canon:** nine-layer L7; Standing Rulings 9, 12; Refinery §2.3/§2.5.
- **Reconciliation:** the rig's Stage-0 floor runs Semgrep today (WP11).
  Canon v2.0 names DeepSource analyzers the deterministic gate with Semgrep
  fallback-only. Ruling: Semgrep remains the *local floor* until this entry
  activates — a fallback holding the seat until the primary lands is not a
  violation; running both as required checks would be (one analyzer voice
  per gate slot).
  Semgrep ruling (WP-STACK §2.2): Semgrep is the mandated LOCAL Stage-0 floor today by canon's own text (§2.3: "DeepSource analyzers (or the Semgrep fallback where DeepSource is not yet implemented)"). "Fallback-only" governs the Stage-2 per-PR analyzer slot only (one analyzer voice per gate). When DeepSource lands at Stage 2, Semgrep KEEPS the local floor. There is no posture in which Semgrep is removed.

- **Includes:** DeepSource analyzers (per-PR deterministic block; AI review
  OFF locally — one AI voice per change); open-code-review (`ocr diff`,
  the required AI voice — precision gate); VulnHuntr (scoped: Python web
  services only, hypotheses not findings, confidence ≥8 → Prove-It);
  CodeRabbit WATCH row: conditional per-repo successor to the
  open-code-review seat ONLY on same-10-PR measured evidence (precision,
  false alarms, convention catches on the same PRs), never fleet-wide,
  never a second voice, PR-Agent unaffected either way.
- **Activation trigger:** with §D.1 (Stage 1–2 machinery) — DeepSource and
  open-code-review land in the Stage-2 lane; open-code-review MAY land
  earlier into preflight lane 4 (`--semantic`) if §D.14's AsyncReview stays
  gated (it holds the same Stage-0 semantic seat the register already
  offers the reviewer seat — record the choice here when made).
- **Prerequisites:** §D.10 gateway (open-code-review and DeepSource AI
  features route model calls through LiteLLM; subscription regime has no
  API lane); runner hardware decision (§D.1).
- **Integration path:** rig-change WP → CI lane templates → dogfood.

Reason class (WP-STACK §2.1): money-gated (needs §D.10 lane) + §D.1 machinery.

### §D.27 (L8) L8 dynamic lanes (Buttercup find-and-patch; OSS-CRS security-skill regression)
- **Canon:** nine-layer L8; Refinery §2.6 Stage 3.5b (Buttercup) and §2.9
  (OSS-CRS regression harness).
- **Includes:** Buttercup campaigns (nightly/weekly, priority services;
  harness prerequisite per target: build script + fuzz harness + seed corpus
  + triage queue — recorded as Task Contracts; every candidate patch lands
  in the human queue; isolated containers, no egress; AGPL-3.0 internal-use
  compliance); OSS-CRS (fixed targets, fixed budgets, matched-budget fuzzing
  baseline — credit the delta over dumb fuzzing, never raw bug counts).
- **Activation trigger:** §D.3 live (ephemeral previews exist) AND first
  deployed product — life event, human-judged.
- **Prerequisites:** §D.10 gateway budget ceilings; §D.15 ledger (campaign
  telemetry); Buttercup trial-first at ~$100 campaign budget.
- **Integration path:** per-service harness-construction Task Contracts,
  then campaign lane config as committed config-as-code.

Reason class (WP-STACK §2.1): canon-pilot-gated (scheduled campaigns; need deployed product + previews).
