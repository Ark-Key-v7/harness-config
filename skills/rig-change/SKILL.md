---
name: rig-change
description: Execute the governed rig-change workflow when the operator has new or updated Factory Rig files (extensions, tools, drivers, templates, skills, projections). Use when the operator says they have new rig files, downloaded files to place, or asks to commit and sync harness-config.
metadata:
  author: Agentic SWE Factory
  version: 1.0.0
  trigger_phrases: ["new rig files", "place these files", "update the rig", "commit and sync harness-config", "I downloaded the new version"]
---

### SKILL: rig-change — governed rig modification workflow

Canon: §5.4 Meta-Harness Restriction — rig changes are human-ratified. This
skill prepares everything and the OPERATOR turns the key at step 5. Never
skip the confirmation.
ACP frontend rule: when the frontend is ACP (Zed), never invoke the
interactive input UI (pi-acp cancels it outright) — pose every question as
plain chat text and proceed only on an explicit typed affirmative; treat
dismissal, timeout, or ambiguity as non-ratification.

#### 1. Trigger Context & Topological Binding
You are operating in the harness-config SOURCE repo (~/factory-rig/sources/harness-config).
Rig law applies: L6 Config-as-Code (every change committed), L12 supply-chain
policy, and the sync chain — source repo → push → pull into the read-only
active clone at ~/.pi/agent. The chain is not done until the pull succeeds.

#### 2. Required Tooling
read, write/edit (target files only), bash (git + node), ls, find.

#### 3. The Procedural Loop (Act → Observe → Exit)

##### Step 1: ACT (intake)
- List candidate files: `ls -t /mnt/c/Users/*/Downloads/ | head -30`
- Ask the operator WHICH files are part of this change (never assume).
- Read each file enough to classify it per the placement table:

| Artifact | Destination |
|---|---|
| extension (`*.ts` with `export default function (pi:`) | `extensions/` |
| repo tooling (`*.mjs` scripts) | `tools/` |
| driver (`*.test.mjs`) | `validation/<name>-smoke/` |
| manifold template | `templates/tmd/` |
| profile | `templates/agents/profiles/` |
| skill folder | `templates/agents/skills/<kebab-name>/` |
| spec / docs | `docs/` |

##### Step 2: ACT (place)
- Copy each file to its destination. Show the operator the full placement
  list before proceeding.

##### Step 3: OBSERVE (validate — deterministic, exit-code routed)
- Run the matching driver for every changed artifact: `node validation/<name>-smoke/<name>.test.mjs`
  - exit 0 → proceed.
  - exit 1 → STOP. Report the failing checks verbatim. Do not commit. Do not
    "fix" silently — report and wait for instruction.
- Run applicable linters: `node tools/lint-tmd.mjs`, `node tools/lint-profiles.mjs`, `node tools/lint-skills.mjs`.
- If templates/ or tools/ changed: `node tools/generate-projections.mjs && node tools/check-projections.mjs` (drift must be clean).

##### Step 4: ACT (stage and propose)
- `git status --short` and `git diff --stat`; show the operator.
- Propose a commit message naming the work package or artifact.

##### Step 5: OBSERVE (human ratification — §5.4)
- Ask the operator explicitly: "Commit, push, and sync? (yes/no)"
- ACP frontend (Zed): ask as plain chat text — never the interactive input
  UI. Proceed ONLY on an explicit typed "yes"; dismissal, timeout, or
  ambiguity count as no.
- If no → leave the working tree staged, report state, EXIT.
- If yes → proceed.

##### Step 6: ACT (commit, push, sync)
- `git add <exact paths>` (never `git add -A` — driver scratch must never be swept in)
- `git commit -m "<agreed message>"`
- `git push`
- `git -C ~/.pi/agent pull --ff-only`

##### Step 7: EXIT PROTOCOL
- The chain is complete ONLY when the pull output shows a fast-forward update.
- Report: files placed, driver results, commit SHA, sync status. Then stop.

#### 4. Local Negative Constraints (Anti-Patterns)
- NEVER run `git add -A` or `git add .` — stage exact paths only.
- NEVER commit with a failing driver (exit 1 anywhere = halt).
- NEVER skip the §5.4 confirmation, even if the operator said "go ahead" earlier in the session — confirm per change-set.
- NEVER treat an ACP dismissal, timeout, or ambiguous reply as ratification —
  only an explicit typed affirmative ratifies.
- NEVER modify files under ~/.pi/agent directly; the active clone is read-only and receives changes only via pull.
