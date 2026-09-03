---
name: project-onboard
description: Onboard a fresh product repository to the governance plane. Use when the operator says they want to start a new project, onboard a repo, or set up the TMD manifold in a directory. Surfaces deferred-register activation notices after scaffolding.
metadata:
  author: Agentic SWE Factory
  version: 1.1.0
  trigger_phrases: ["start a new project", "onboard this project", "set up the manifold", "new repo setup"]
disable-model-invocation: true
---

### SKILL: project-onboard (fresh-project procedure, WP10; WP11 activation surfacing)

#### 1. Trigger Context & Topological Binding
The operator wants to bring a product repository under the governance plane.
The rig clone must be current before anything else: ask the operator to run
`git -C ~/.pi/agent pull --ff-only` (human pulls the rig — the agent never
modifies the harness). Manifold reads are explicit: after placement, read
each `.tmd/` file before proposing any Zone C fill.
Brownfield targets: the operator says so, and passes `--brownfield`.

#### 2. Required Tooling
bash, read, write. A seat whose actuation boundary lacks these MUST NOT
invoke this skill.

#### 3. The Procedural Loop (Act → Observe → Exit)

##### Step 1: ACT (scaffold)
- Execute: `node ~/.pi/agent/bin/onboard-project.mjs --target .`
  (run from the product repository root; add `--brownfield` when the
  operator declares a legacy codebase).

##### Step 2: OBSERVE (scaffold result + activation notices)
- If the tool exits non-zero (refusal — existing governance files, stale rig):
  report the refusal verbatim and STOP. Never force a re-onboard; cleanup of a
  stale layer is a human decision.
- If exit 0: the layer is placed and self-validated. Proceed.
- The tool prints an ACTIVATION NOTICE for every deferred-register trigger
  that fired (first product repo, brownfield, Convex backend, Lavish).
  Relay every notice VERBATIM to the operator, each with its register
  anchor (docs/CAPABILITY_REGISTER.md §D.x). You surface; the operator
  decides. NEVER integrate a deferred tool yourself (§5.4 Meta-Harness).

##### Step 3: ACT (topological mapping, Phase 2 — with the operator)
- Walk the codebase (read-only) and propose, for operator approval:
  the Stack Manifest (gravity.md §C.1), the Sub-Graph Registry (§C.3 — one
  node per bounded context with write_scope/read_scope/owning_role),
  path-scoped rules (rules.md Zone C), budgets and vendors (promises.md
  Zone C), glossary terms, and design.md's state (inert or filled).
- Present every proposed fill to the operator BEFORE writing it. Zone C is
  law — the human authors it, the agent drafts.
- ACP frontend rule: when the frontend is ACP (Zed), never invoke the
  interactive input UI (pi-acp cancels it) — request approval as plain chat
  text and proceed only on an explicit typed affirmative; dismissal,
  timeout, or ambiguity are non-ratification.

##### Step 4: OBSERVE (validation)
- Execute: `node ~/.pi/agent/bin/lint-tmd.mjs .tmd --agents AGENTS.md`
  (template mode while slots remain).
- If violations: fix the named slot and re-run. Loop until VALID.

##### Step 5: EXIT PROTOCOL
- Print the Phase 4 handoff and stop: the operator reviews the full diff,
  sets `last_verified` on all five `.tmd/` headers to `git rev-parse HEAD`,
  validates with `lint-tmd --strict`, and commits. The Meta-Harness
  Restriction applies from that commit. The skill does not commit.
- Remind the operator: from the first commit onward,
  `node ~/.pi/agent/bin/preflight.mjs --staged` runs before every commit
  (Refinery Stage 0, canon §6.3).

#### 4. Local Negative Constraints (Anti-Patterns)
While executing this specific skill, you are mathematically forbidden from:
- Committing anything to the product repository (Phase 4 is human ratification).
- Filling Zone C slots without explicit operator approval of the draft.
- Duplicating canon text into project files (L5 — reference the manifold).
- Running the onboard tool with any flag that would overwrite existing files.
- Installing or activating any deferred-register tool, even when its
  activation notice fired — notices go to the operator, period.
