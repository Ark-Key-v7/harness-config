---
name: slice-plan
description: Decompose an approved PRD into a plan of size-capped vertical slices and draft their task contracts. Use when the operator says "plan this", "slice this PRD", "draft contracts", or after spec-intake completes.
metadata:
  author: Agentic SWE Factory
  version: 1.0.0
  trigger_phrases: ["plan this", "slice this", "slice the PRD", "draft contracts", "draft a task contract"]
---

### SKILL: slice-plan — PRD → plan → slices → contracts (TCE v2.1 §2.A)

Canon: a slice is vertically-thin (crosses all layers), independently
mergeable, and size-capped (≤500 prod lines / ≤12 files / ≤1500 total,
Harness §4.7). Decomposition happens here, while it is cheap.

#### 1. Trigger Context
Governed project with an approved specs/prd/<slug>.md. Read it, the
manifold (.tmd/gravity.md Registry especially — slices must name a
registered sub_graph), and existing specs/plans/ to avoid slug collisions.

#### 2. The Procedural Loop
Step 1 ACT: propose the slice decomposition — each slice: name, layers
crossed, directories touched, visible output, estimated size. If any slice
exceeds the caps, decompose it further BEFORE presenting.
Step 2 OBSERVE: operator approves or reorders (typed). Loop until approved.
Step 3 ACT: write specs/plans/<slug>.md from the template.
Step 4 ACT: for each slice, draft .agents/tasks/task-<slug>-s<n>.md from
the task-contract template: manifest (trace: specs/plans/<slug>.md#S<n>,
sub_graph from gravity Registry), inherit slices, must_haves truths +
artifacts, validation_commands, budgets, holdout pointer.
Step 5 OBSERVE: for each contract run
  node ~/.pi/agent/bin/lint-contract.mjs <file> --gravity .tmd/gravity.md
exit 1 → report failing checks verbatim, fix only with operator-visible
edits, re-run. Then run lint-spec over specs/ — must exit 0.
Step 6 EXIT: report plan + contracts; next step is scope resolution per
contract (contract-scope.mjs). Never commit.

#### 3. Local Negative Constraints
- NEVER author a contract whose sub_graph is not in the gravity Registry.
- NEVER exceed the size caps in a presented slice — decompose first.
- NEVER write the holdout file — holdouts are authored at review time,
  builder-blind (Harness E.7).
