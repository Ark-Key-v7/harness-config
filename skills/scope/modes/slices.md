# Scope Mode: slices (plan + contracts — ported from slice-plan v2.1.0)

Governed project with an approved `specs/prd/<slug>.md`: decompose the change into size-capped vertical slices and draft their task contracts. Canon: a slice is vertically-thin (crosses all layers), independently mergeable, and size-capped (≤500 prod lines / ≤12 files / ≤1500 total, Harness §4.7). Decomposition happens here, while it is cheap. Reached from the plan/replan behavior ("queue the next slice" on a governed project) or directly after `modes/spec.md` Step 7.

Read the approved PRD, the manifold (`.tmd/gravity.md` Registry especially — slices must name a registered sub_graph), and existing `specs/plans/` to avoid slug collisions.

## When NOT to use this mode

- No approved PRD exists — planning before the spec chain (`modes/spec.md`) completes inverts the chain (intent → PRD → plan → slice → contract).
- The operator wants implementation — slicing is decomposition, not building.
- The request is a single trivial change that needs no contract — the contract machinery is overhead below the size floor.

## The loop

**Step 1 ACT — propose the decomposition.** Slices decompose the change's delta requirements, not just the PRD prose — every slice names the requirement IDs (REQ-<domain>-<nnn>) it lands, and each E.1 contract carries them in its optional `requirements: [REQ-...]` manifest list (lint-contract validates it against the delta). Each slice: name, layers crossed, directories touched, visible testable output, dependencies, estimated size, and the tier it inherits (roadmap header default, or the feature's `· tier` override — the contract's `tier:` field per WP-F D-2). Record the architecture decisions and global constraints for the plan header (decision decisions come from `/architect`'s ADRs and contract-prep sections — this mode records them, never invents them). If any slice exceeds the caps, decompose it further BEFORE presenting. Then run the task-quality gate: validate every slice against `references/task-quality.md` in this skill directory — sizing (L or larger → break down), no placeholders, acceptance criteria + verification + a Consumes/Produces interface note where slices interact. If a plan file with unchecked work already exists for different work, stop and ask — never overwrite it.

**Step 2 OBSERVE — plan approval.** Operator approves or reorders (typed). Loop until approved.

**Step 3 ACT — write the plan.** Write `specs/plans/<slug>.md` from the template: architecture decisions, global constraints, ordered slices, checkpoints, risks, open questions.

**Step 4 ACT — draft the contracts.** For each slice, draft `.agents/tasks/task-<slug>-s<n>.md` from the task-contract template: manifest (trace: `specs/plans/<slug>.md#S<n>`, sub_graph from gravity Registry, `tier:` per D-2), inherited constraints, must_haves truths + artifacts, validation_commands, budgets, holdout pointer.

**Step 5 OBSERVE — lint.** For each contract run `node ~/.pi/agent/bin/lint-contract.mjs <file> --gravity .tmd/gravity.md`; exit 1 → report failing checks verbatim, fix only with operator-visible edits, re-run. Then run lint-spec over `specs/` — must exit 0.

**Step 6 ACT (optional) — ticket export.** Only when the operator asks for tracker tickets. Print the proposed ticket list (titles + slice grouping) and confirm before creating anything — creating real tickets is not reversible in one click. Then create via `gh issue create --title "..." --body "..."`, with acceptance criteria as a markdown checklist in the body and a `slice-N` label per slice (`gh label create` if missing). Report a table: ticket → slice → created issue URL. Every ticket must trace back to a slice and carry verifiable acceptance criteria; if a slice is too vague to decompose, stop and flag it — that is a spec gap, not a ticket-writing problem. If the operator names a different tracker, stop and confirm the platform rather than guessing.

**Step 7 EXIT.** Report plan + contracts; next step is scope resolution per contract (`contract-scope.mjs`). Execution of the plan follows the stop-and-ask posture in `references/task-quality.md`. Never commit.

## Local negative constraints

- NEVER author a contract whose sub_graph is not in the gravity Registry.
- NEVER exceed the size caps in a presented slice — decompose first.
- NEVER write the holdout file — holdouts are authored at review time, builder-blind (Harness E.7).
- NEVER emit a plan containing a placeholder banned by `references/task-quality.md` (TBD-as-requirement, "add appropriate error handling", "similar to Task N").
- NEVER author or edit `.tmd/` law — boundaries come from the Registry as it stands; a missing sub_graph is a stop-and-route, not an edit.