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

### PRD guards (from cole plan-create-prd)

1. **Intent-framed, never solution-prescriptive.** Don't name the solution in the problem statement. Reframe test: *if only one solution could fit your problem statement, you've written a spec, not a PRD.* A good problem leaves room for more than one answer. (❌ "Add a reply button to every message." ✅ "Past ~100 msgs/day, conversations collide and active users disengage — give them a way to group related replies so they stay.")
2. **A PRD never decides engineering.** Library & version, data-model relationships, security boundaries, testing architecture, error handling, project structure — these are slice-plan/spec decisions. Skipped engineering decisions don't vanish; they become vulnerabilities. Hand them downstream deliberately.

**Anti-fluff rule (from cole plan-create-prd):** never invent plausible requirements. Unknown → write **"TBD — needs validation"**. If the operator declines the interview ("just write it"), honour it, but name what you would have to guess, offer the two or three highest-leverage questions instead of all of them, and ship everything still unanswered as "TBD — needs validation", never as an invented requirement.

### Hypothesis block (required — from cole plan-create-prd)

Every PRD carries a falsifiable hypothesis. The WRONG condition is the most-skipped line and the one that makes it falsifiable — no hypothesis ships without it:

We believe [change] will cause [these users] to [do Y], resulting in [outcome].
We'll know we're RIGHT if [leading signal] within [timeframe].
We'll know we're WRONG if [counter-signal / a guardrail moves].

### Test-seam thinking (from matt to-spec)

When framing acceptance criteria, sketch the seams at which the feature will be tested. Prefer existing seams to new ones; use the highest seam possible; the fewer seams across the codebase the better — the ideal number is one. And keep the PRD free of specific file paths and code snippets — they go stale immediately. Exception: a snippet that encodes a *decision* more precisely than prose can (state machine, schema, type shape) may be inlined within the relevant decision, trimmed to the decision-rich parts.
Step 5 OBSERVE: operator approves or amends. Loop until approved.
### Door check (from cole plan-create-prd)

Classify the decision: **two-way door** (reversible) → proceed to slicing; **one-way door** (expensive to undo) → spike first. Optional pressure-test — Cagan's four risks: **Value** (do they want it more than how they cope today?) · **Usability** (can they use it?) · **Feasibility** (can we build it?) · **Viability** (does it work for the business?). Most teams over-invest feasibility and under-invest value.

Step 6 EXIT: run node ~/.pi/agent/bin/lint-spec.mjs specs/ — must exit 0.
Report both artifacts and the next step: "slice-plan to decompose into
slices and contracts." Never commit — the operator commits.

#### 3. Local Negative Constraints
- NEVER author Zone C manifold entries directly — the PRD's compiles-to
  table is the proposal; manifold edits are a separate approved step.
- NEVER skip the approval loop; an unapproved artifact is not committed law.
- NEVER invent success criteria the operator did not state; ask.
