# CAPABILITY_REGISTER.md — what this rig can do, and what waits for its gate (WP11)

Two halves. **Integrated** = live today, with its surface and driver.
**Deferred** = registered, with canon source, an explicit *activation
trigger*, prerequisites, and integration path. The deferred half answers
"when does this turn on?" — you never have to remember; the triggers below
are the memory. Machine-readable detection for the subset that is
filesystem-detectable lives in `docs/activation-triggers.json`, evaluated by
`bin/check-activations.mjs` at every project onboarding (and standalone).

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
| Project onboarding | Phase-1 scaffold + self-lint + activation notices | `bin/onboard-project.mjs` + `skills/project-onboard/` | `validation/onboard/` |
| Refinery Stage 0 (local pre-flight) | Semgrep injection floor + contract lane before commit (WP11) | `bin/preflight.mjs` + `templates/semgrep/base.yml` | `validation/refinery-lane/` |
| Activation detector | Surfaces fired deferred-register triggers (WP11) | `bin/check-activations.mjs` + `docs/activation-triggers.json` | `validation/refinery-lane/` |
| State spine (E.2) | STATE.md schema, genesis, dual failure vocabulary, wt.toml hook contract | `templates/agents/schemas/state.schema.yaml`, `bin/state-genesis.mjs`, `bin/lint-state.mjs`, `bin/lint-wt-hook.mjs` | `validation/state-hook/` |
| Projection engine | Templates → harness projections, input-head freshness law | `bin/generate-projections.mjs`, `bin/assert-projection-fresh.mjs`, `bin/check-projections.mjs` | `validation/projections/` |
| Manifold linter | Header law (last_verified = SHA), Zone discipline, template/strict modes | `bin/lint-tmd.mjs` | `validation/tmd/` |
| Profile linter | Sovereign profile format law (incl. substitution_bounds) | `bin/lint-profiles.mjs` | `validation/profiles/` |
| Skill linter | SKILL.md format gate (E.6 frontmatter, trigger phrases) | `bin/lint-skills.mjs` | `validation/skills/` |
| Skills (global, post-v2.1) | rig-change · pr-review · tool-intake · template-skill · project-onboard | repo-root `skills/` | `validation/skills/` |
| Supply-chain floor (canon §6.6 M2/M3) | --ignore-scripts, exact pins, frozen lockfiles | `package-pins.json` + runbook gates | `validation/pi-layer/` |
| Outer machine floor | semgrep, pr-agent tool installs + smoke fixtures (machine-local, not the repo) | `~/factory-rig/tools/` | outer `validation/` |

---

## Deferred register

Canon references use the handbook's own section numbers. "Trigger" is the
observable condition that makes the item activatable — not a suggestion.

### §D.1 Refinery pipeline machinery (Stages 1–3 core, merge queue, CD handoff)
- **Canon:** CI/CD Integration Engine §2.3–§2.8; §7.1 Phase 3.
- **Includes:** Stage-1 CI gates (Fallow, ESLint, tsc, bun test); merge queue (batch-then-bisect, pairwise-conflict serialization); Worktrunk adoption (wt.toml leaves the inert register); PR-Agent Stage-2 container; CodeQL weekly lane; Stage-4 SLA/auto-merge mechanics; Vercel/Coolify CD routing.
- **Activation trigger:** the FIRST product repository completes onboarding (auto-detected: `check-activations` T1). PR-Agent specifically also requires §D.10 (gateway) — on the subscription regime it has no API lane until then.
- **Prerequisites:** product repo on the SCM hub; Stage-0 lane green locally; runner hardware decision (Blacksmith.sh Phase 1 vs Hetzner+Coolify Phase 2).
- **Integration path:** rig-change WP → GitHub Actions workflow templates added to `templates/` (projected into products at onboard) → dogfood on the product repo.

### §D.2 Execution sandbox (Daytona / rootless Podman dev-container quarantine)
- **Canon:** §6.6 Mandate 1; §6.2 execution boundary; Stage 0 runs INSIDE it.
- **Activation trigger:** first product repo (with §D.1) — canon wants preflight confined, not on the host.
- **Prerequisites:** Daytona install on WSL2; container image pins.
- **Integration path:** wt.toml `mount` hook becomes live; preflight gains `--container` mode.

### §D.3 Convex-dependent lanes (Stage-3 E2E ephemeral previews; schema pipeline)
- **Canon:** §2.6; §6.2 Convex Mandate; §7.1 Phase 3 (Midscene against preview).
- **Activation trigger:** a governed project contains `convex/` (auto-detected: T3). Until then the Mandate rides as an activation notice + promises.md Zone C entries.
- **Prerequisites:** Convex OSS preview deployments; Playwright baseline suite; Midscene pilot budget.
- **Integration path:** per-project CI lane; circuit breaker config as committed config-as-code.

### §D.4 Brownfield archaeology stack
- **Canon:** §7.2 (GitNexus AST maps, jCodeMunch MCP extraction, AMUX read-only swarm, artifact hierarchy).
- **Activation trigger:** operator declares a brownfield target (`--brownfield` at onboarding; auto-detected: T2).
- **Prerequisites:** GitNexus PolyForm Noncommercial license decision (or bake-off vs CodeGraph / codebase-memory-mcp — open decision, FACTORY_STATUS); AMUX↔Pi adapter boundary (open decision).
- **Integration path:** tool-intake WP per tool; swarm SOP into FRESH_PROJECT_SOP.

### §D.5 Lavish A2UI review surface
- **Canon:** Constraint-Driven Lifecycle Phase 2 (lavish-axi, local-first); Stage 4 Vibe Diff.
- **Activation trigger:** the first Phase-2 manifold review on a real project (auto-detected: T4 notice at every onboarding).
- **Prerequisites:** lavish-axi CLI install; local-first serving check.
- **Integration path:** tool-intake WP; project-onboard Step 3 gains the visual loop.

### §D.6 Betterleaks secrets lane
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

### §D.8 Token-economy adjuncts (Headroom, Ponytail, Tokenjuice; BetterDB cache; Caveman WATCH)
- **Canon:** §6.4 adjunct list with seat law; §6.5 BetterDB session cache (SESSION_CACHE_THRESHOLD 0.95).
- **Activation trigger:** token pain — sustained context-pressure on real tasks (operator-judged); BetterDB specifically when redundant-query loops show up in debugging sessions.
- **Prerequisites:** per-tool intake (Headroom: MCP-server mode only, compression exclusions preconfigured; Ponytail: vendored as Sovereign Skill Protocol folders; Tokenjuice: pilot with fixture-regressed rules; Caveman stays WATCH).
- **Integration path:** tool-intake WP per tool; never wrap/proxy modes (chargeback-chain law).

### §D.9 Stage-3.5 pilots (Strix agentic pentest; Claw Patrol egress firewall)
- **Canon:** §2.6.5 — both pilot-gated by canon itself (scheduled-only pentest; mechanical allow/deny only, llm_approver forbidden).
- **Activation trigger:** §D.3 live (Strix needs the ephemeral preview) and first high-privilege agent seat (Claw Patrol).
- **Prerequisites:** LiteLLM budget ceiling (§D.10); Tailscale mesh (§D.11) for Claw Patrol.
- **Integration path:** one-month pilots with canon-stated success criteria; CI fixture regression for firewall policy.

### §D.10 LiteLLM gateway + FinOps gateway regime
- **Canon:** §6.4 (retries vs fallbacks, circuit breakers, X-LiteLLM-Trace-Id chargeback; one gateway owns the API-billed lane).
- **Activation trigger:** adoption of the FIRST API-billed engine (any non-subscription model seat). Not auto-detectable — a life event (see OPERATOR_GUIDE).
- **Prerequisites:** Docker + Coolify host (local Phase 1 or Hetzner Phase 2); API keys; budget ceilings per seat.
- **Integration path:** STATE.md `finops.regime` flips per contract; PR-Agent (§D.1) unblocks.

### §D.11 Hetzner production perimeter
- **Canon:** §6.1 (Tailscale mesh, UFW 80/443 only, CrowdSec at Traefik, Let's Encrypt).
- **Activation trigger:** the local→Hetzner migration decision (§1.1) — a life event, not auto-detectable.
- **Prerequisites:** Hetzner bare metal; Coolify; the Migration Runbook doubles as the build sheet.
- **Integration path:** infra WP; Claw Patrol/Strix lanes (§D.9) become deployable.

### §D.12 State Survival machinery (ledger replication, rig-rebuild runbook)
- **Canon:** §6.7 (Litestream off-rig replication; corruption recovery; rebuild-by-script).
- **Activation trigger:** the moment `trace-ledger.sqlite` first exists (i.e., with §D.7/D.10 telemetry) — zero-durability state is an unpriced risk from that instant.
- **Prerequisites:** object storage target; WAL snapshots schedule.
- **Integration path:** harness config only — never the manifold (canon: backup is factory machinery).

### §D.13 Curated MCP stack + pi-mcp-adapter
- **Canon:** v1.2 §2.11 curation rulings; MCP 2026-07-28 alignment (§6.4 Protocol Alignment).
- **Status note:** `pi-mcp-adapter` is PINNED, pending install; Serena/Context7 activate on first need.
- **Activation trigger:** first task needing LSP-grade navigation (Serena) or library docs (Context7) — agent-judged, surfaced via tool-intake.
- **Integration path:** install adapter → curate servers through `lint-mcp.mjs` → project `.mcp.json`.

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

---

*Maintenance rule: any status flip (deferred → pilot → live) updates this
register AND docs/CANON_MAP.md in the same commit. Trigger IDs referenced by
docs/activation-triggers.json are driver-checked — a register entry without
its trigger line fails validation/canon-register.*
