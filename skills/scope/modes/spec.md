# Scope Mode: spec (rig-chain compilation — ported from spec-intake v2.1.0)

Governed project (has `.tmd/`): the plan/replan answers compile into the rig's Phase-0 chain — `specs/intent/<slug>.md` → `specs/prd/<slug>.md` → `specs/changes/<slug>/delta.md` — before any feature's decision work (`/architect`) or slicing (`modes/slices.md`). Canon: the chain is intent → PRD → plan → slice → Task Contract (E.1) → PR → incident record; this mode authors the first links. The agent drafts; the human approves — Zone C law is human-authored. ACP frontend (Zed): questions as plain chat text; proceed only on explicit typed answers.

If `specs/` does not exist, scaffold it: `specs/intent/`, `specs/prd/`, `specs/plans/` (copy templates from the rig's `templates/specs/`).

## Step 0 — Intent clarity gate

Before any intake work, assess: is the ask missing who it's for, why now, what success looks like, or the binding constraint? If yes, and the session is interactive, run the `interview-me` skill first (reference it; do not restate it — L5). Its confirmed statement of intent becomes this mode's input. Headless: terminate `needs_human` with the missing elements listed (Harness §5.8).

## The loop

**Step 1 ACT — intent interview.** Ask in small clusters (typed answers, one cluster at a time): (a) the problem in one paragraph and the slug; (b) the proposed outcome and affected users/systems; (c) binding constraints; (d) success criteria and out-of-scope; (e) open questions. Apply the reframe test to the problem statement; apply the anti-fluff rule (below) throughout. Where the /scope plan interview already answered a cluster, carry the answer forward — never re-ask what the roadmap rows already record.

**Step 2 ACT — draft the intent.** Write `specs/intent/<slug>.md` from the template — all sections: problem, proposed outcome, affected users and systems, constraints, success criteria, out of scope, open questions. One screen; an intent that needs chapters is a PRD signal.

**Step 3 OBSERVE — intent approval.** Present the draft. Operator approves or amends (typed). Loop until approved. Set `status: approved` only on explicit approval.

**Step 4 ACT (optional) — divergent refinement.** Run only when the operator asks to "refine", "ideate", or "stress-test" the idea before committing. Generate 5–8 variations of the concept using these lenses: **inversion** (what if we did the opposite), **constraint removal** (what if budget/time/tech weren't factors), **audience shift** (what if this were for a different user), **combination** (what if merged with an adjacent idea), **simplification** (the 10x simpler version), **10x scale** (what this looks like at massive scale), **expert lens** (what domain experts find obvious that outsiders don't). Stress-test the resonating directions against user value, feasibility, and differentiation. Surface hidden assumptions explicitly: what we're betting is true, what could kill the idea, what we're choosing to ignore. The output must include a **"Not Doing (and Why)" list** — focus is about saying no to good ideas; that list is the most valuable part. Do not generate 20+ shallow variations; do not yes-machine weak ideas — push back with specificity. Converge back into the intake flow once the operator picks a direction, and fold the outcome into the approved intent before proceeding.

**Step 4b ACT — delta decision.** Ask: does this PRD create a new capability or modify existing behavior? New → draft `specs/changes/<slug>/delta.md` from the delta template, all-ADDED. Modify → read the affected `specs/domains/*/spec.md` files FIRST (they are the current truth; the PRD's Evidence section cites them), then draft MODIFIED/REMOVED entries against named requirement IDs. If the behavior being modified has no living spec (pre-WP-E work), the delta is all-ADDED with a note `baselining: true` — the first archive baselines that domain.

**Step 5 ACT — PRD interview and draft.** For each PRD section, interview then draft: problem statement (evidence-grounded); evidence (or "Assumption — validate via [method]"); thesis; the falsifiable hypothesis — co-write it, and never ship one without the WRONG condition; target user / JTBD / non-users; requirements as verifiable statements, each with its compile target (rules / glossary / promises / slice) and its test seam (below); MVP scope; outcome-shaped success metrics; non-goals; Zone C additions (glossary, invariants, promises); open questions as named checkboxes. Apply the PRD guards and the anti-fluff rule.

**Step 6 OBSERVE — PRD approval.** Present the draft. Operator approves or amends (typed). Loop until approved.

**Step 7 ACT — door check.** Classify the decision: **two-way door** (reversible) → proceed to slicing (`modes/slices.md`) or the decision work (`/architect`) per the scope row; **one-way door** (expensive to undo) → spike first. Optional pressure-test — Cagan's four risks: **Value** (do they want it more than how they cope today?) · **Usability** (can they use it?) · **Feasibility** (can we build it?) · **Viability** (does it work for the business?). Most teams over-invest feasibility and under-invest value.

**Step 8 EXIT.** Run `node ~/.pi/agent/bin/lint-spec.mjs specs/` — must exit 0, with `specs/changes/<slug>/delta.md` drafted and delta-lint green. Report the artifacts (intent, PRD, delta) and the next step per the scope row: "`/architect <feature>` for the decision" when the row is `needs a decision`, else "`/scope` slices mode to decompose into slices and contracts." Never commit — the operator commits.

## Local negative constraints

- NEVER author Zone C manifold entries directly — the PRD's compiles-to table is the proposal; manifold edits are a separate approved step (`.tmd/` is law; Amendment Protocol only).
- NEVER skip an approval loop; an unapproved artifact is not committed law.
- NEVER invent success criteria, evidence, or requirements the operator did not state; ask.
- NEVER let an intent exceed one screen — split the work or promote to PRD scope.
- NEVER ship a hypothesis without its WRONG condition.

## Referenced disciplines (harvested, applied in-loop)

**PRD guards (from cole plan-create-prd):**

1. **Intent-framed, never solution-prescriptive.** Don't name the solution in the problem statement. Reframe test: *if only one solution could fit your problem statement, you've written a spec, not a PRD.* A good problem leaves room for more than one answer. (❌ "Add a reply button to every message." ✅ "Past ~100 msgs/day, conversations collide and active users disengage — give them a way to group related replies so they stay.")
2. **A PRD never decides engineering.** Library & version, data-model relationships, security boundaries, testing architecture, error handling, project structure — these are slice/decision decisions. Skipped engineering decisions don't vanish; they become vulnerabilities. Hand them downstream deliberately.

**Anti-fluff rule:** never invent plausible requirements. Unknown → write **"TBD — needs validation"**. If the operator declines the interview ("just write it"), honour it, but name what you would have to guess, offer the two or three highest-leverage questions instead of all of them, and ship everything still unanswered as "TBD — needs validation", never as an invented requirement.

**Test-seam thinking:** when framing acceptance criteria, sketch the seams at which the feature will be tested. Prefer existing seams to new ones; use the highest seam possible; the fewer seams across the codebase the better — the ideal number is one. Keep the PRD free of specific file paths and code snippets — they go stale immediately. Exception: a snippet that encodes a *decision* more precisely than prose can (state machine, schema, type shape) may be inlined within the relevant decision, trimmed to the decision-rich parts.