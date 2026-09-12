---
name: spec-intake
description: Author Phase-0 spec chain artifacts (intent, PRD) through a structured interview when the operator has new work. Use when the operator says "new work", "I have an idea", "start a feature", "draft an intent", "write a PRD".
metadata:
  author: Agentic SWE Factory
  version: 1.1.0
  class: procedural
  trigger_phrases: ["new work", "I have an idea", "start a feature", "draft an intent", "write a PRD", "new intent"]
---

### SKILL: spec-intake — Phase-0 artifact authoring (TCE v2.1 §2.A)

Canon: the chain is intent → PRD → plan → slice → contract. You author the
first two links. The agent drafts; the human approves — Zone C law is
human-authored. ACP frontend (Zed): questions as plain chat text; proceed
only on explicit typed answers.

### Step 0: Intent clarity gate

Before any intake work, assess: is the ask missing who it's for, why now, what success looks like, or the binding constraint? If yes, and the session is interactive, run the `interview-me` skill first (reference it; do not restate it — L5). Its confirmed statement of intent becomes this skill's input. Headless: terminate `needs_human` with the missing elements listed.

#### 1. Trigger Context
You are in a governed project (has .tmd/). If specs/ does not exist,
scaffold it: specs/intent/, specs/prd/, specs/plans/ (copy templates from
~/.pi/agent/templates/specs/).

#### When NOT to Use
- The work already has an approved PRD — the chain moves forward to
  slice-plan, not back to intake.
- The operator wants a bug triaged or a small fix landed — that is not
  Phase-0 spec work.
- The operator only wants the manifold updated — Zone C edits are a separate
  ratified step, never bundled into intake.

#### 2. The Procedural Loop
Step 1 ACT: ask for a one-paragraph problem statement and the slug.
Step 2 ACT: draft specs/intent/<slug>.md from the template — problem,
observable success criteria, out-of-scope. Present it.

### Optional step: divergent refinement (idea-refine harvest)

Run only when the operator asks to "refine", "ideate", or "stress-test" the idea before committing. Generate 5–8 variations of the concept using these lenses: **inversion** (what if we did the opposite), **constraint removal** (what if budget/time/tech weren't factors), **audience shift** (what if this were for a different user), **combination** (what if merged with an adjacent idea), **simplification** (the 10x simpler version), **10x scale** (what this looks like at massive scale), **expert lens** (what domain experts find obvious that outsiders don't). Stress-test the resonating directions against user value, feasibility, and differentiation. Surface hidden assumptions explicitly: what we're betting is true, what could kill the idea, what we're choosing to ignore. The output must include a **"Not Doing (and Why)" list** — focus is about saying no to good ideas; that list is the most valuable part. Do not generate 20+ shallow variations; do not yes-machine weak ideas — push back with specificity. Converge back into the intake flow once the operator picks a direction.
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
