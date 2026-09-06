---
name: spec-intake
description: Author Phase-0 spec chain artifacts (intent, PRD) through a structured interview when the operator has new work. Use when the operator says "new work", "I have an idea", "start a feature", "draft an intent", "write a PRD".
metadata:
  author: Agentic SWE Factory
  version: 1.0.0
  trigger_phrases: ["new work", "I have an idea", "start a feature", "draft an intent", "write a PRD", "new intent"]
---

### SKILL: spec-intake — Phase-0 artifact authoring (TCE v2.1 §2.A)

Canon: the chain is intent → PRD → plan → slice → contract. You author the
first two links. The agent drafts; the human approves — Zone C law is
human-authored. ACP frontend (Zed): questions as plain chat text; proceed
only on explicit typed answers.

#### 1. Trigger Context
You are in a governed project (has .tmd/). If specs/ does not exist,
scaffold it: specs/intent/, specs/prd/, specs/plans/ (copy templates from
~/.pi/agent/templates/specs/).

#### 2. The Procedural Loop
Step 1 ACT: ask for a one-paragraph problem statement and the slug.
Step 2 ACT: draft specs/intent/<slug>.md from the template — problem,
observable success criteria, out-of-scope. Present it.
Step 3 OBSERVE: operator approves or amends (typed). Loop until approved.
Step 4 ACT: interview for requirements — for each: the requirement as a
verifiable statement, and where it compiles (rules / glossary / promises /
slice). Draft specs/prd/<slug>.md.
Step 5 OBSERVE: operator approves or amends. Loop until approved.
Step 6 EXIT: run node ~/.pi/agent/bin/lint-spec.mjs specs/ — must exit 0.
Report both artifacts and the next step: "slice-plan to decompose into
slices and contracts." Never commit — the operator commits.

#### 3. Local Negative Constraints
- NEVER author Zone C manifold entries directly — the PRD's compiles-to
  table is the proposal; manifold edits are a separate approved step.
- NEVER skip the approval loop; an unapproved artifact is not committed law.
- NEVER invent success criteria the operator did not state; ask.
