# Fresh Project SOP — Onboarding a Product Repository to the Factory Rig

_Prerequisite: the rig is installed and current (`git -C ~/.pi/agent pull --ff-only`). One-time per product repository. Commands assume the rig clone at `~/.pi/agent`._

## Phase 1 — Cognitive alignment (mechanical)

```bash
cd /path/to/new-project
node ~/.pi/agent/tools/onboard-project.mjs --target .
```

The tool places: root `AGENTS.md`, `.tmd/` (five manifold files), `.agents/` (profiles, skills, schemas, `tasks/`), `.pi/` (settings, `.mcp.json`, `.gitignore`, README, `append-system.md` projection). It self-validates (lint-tmd template mode, lint-mcp) and **refuses to overwrite** anything already present. It does not commit.

Then walk the codebase with the agent (scout seat: `/seat scout`) — read-only tour to map the territory before any law is written.

## Phase 2 — Topological mapping (human + agent, fills Zone C)

1. **gravity.md §C.1** — Stack Manifest: declare vendors (single vendor-declaration point).
2. **gravity.md §C.3** — Sub-Graph Registry: one node per bounded context, with `write_scope`, `read_scope` (write scope + declared dependency closure), `owning_role`.
3. **rules.md Zone C** — path-scoped `scoped_laws` where the ten anti-slop laws need local sharpening.
4. **promises.md Zone C** — budgets, vendors, project-specific async/network promises (gateway cap if gateway-governed).
5. **glossary.md Zone C** — every normative term in the ubiquitous language; forbidden synonyms.
6. **design.md Zone C** — if the project ships UI; otherwise the inert-state declaration stands.
7. Add `STATE.md` to the project's `.gitignore` (per-worktree artifact — never committed) and copy `~/.pi/agent/templates/wt.toml` to the repo root if worktree-per-task execution is used.

## Phase 3 — Projection check

The projection was placed verbatim by onboarding. Confirm it matches the rig's committed projection:

```bash
diff .pi/append-system.md ~/.pi/agent/projections/pi/append-system.md && echo CLEAN
```

## Phase 4 — Stamp and ratify (human)

1. Review the **full diff** of everything onboarding placed and you filled.
2. Set `last_verified` in all five `.tmd/` headers to the current HEAD SHA: `git rev-parse HEAD`.
3. Validate strict: `node ~/.pi/agent/tools/lint-tmd.mjs .tmd --strict --agents AGENTS.md`
4. Commit. **The Meta-Harness Restriction applies from this commit** — manifold changes from now on go through the Amendment Protocol (GitOps, header advance).

## Per-task loop (steady state)

```bash
# 1. Draft a contract
cp ~/.pi/agent/templates/task-contract.md .agents/tasks/task-<slug>.md   # fill Zone C
node ~/.pi/agent/tools/lint-contract.mjs .agents/tasks/task-<slug>.md --gravity .tmd/gravity.md

# 2. Resolve the scope the sandbox guard will enforce
node ~/.pi/agent/tools/contract-scope.mjs --contract .agents/tasks/task-<slug>.md \
  --gravity .tmd/gravity.md --out .pi/scope.json

# 3. Work — pick the seat
#    In Pi:  /seat worker      (scout for recon, planner for specs, reviewer for review)
#    The guard now blocks out-of-scope writes automatically.

# 4. Worktree execution (if used): STATE.md genesis per task
node ~/.pi/agent/tools/state-genesis.mjs --schema .agents/schemas/state.schema.yaml \
  --contract task-<slug>.md --contract-id <id> --worktree /abs/path --branch <branch> --out STATE.md

# 5. Review: /seat reviewer → invoke the pr-review skill → E.4 EvaluationResult
```

## Abort conditions

- `contract-scope` fails → the sub-graph is not registered; fix gravity.md, never bypass.
- The guard blocks a write you believe is in scope → the scope file is stale or the Registry is wrong; resolve, don't force.
- Any manifold ambiguity → Conflict Halt: stop, resolve by human PR advancing `last_verified`.
