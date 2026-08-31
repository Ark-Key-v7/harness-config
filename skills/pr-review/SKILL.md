---
name: pr-review
description: Execute the agent-adversarial PR review procedure (Principal Review Rubric / Stage gates) against a completed Task Contract. Use when reviewing a PR, verifying a worker's output, or when a contract reaches Stage 2/Stage 4.
metadata:
  author: Agentic SWE Factory
  version: 1.0.0
  trigger_phrases: ["review this PR", "verify this contract", "stage 2 review", "adversarial review"]
---

### SKILL: pr-review — conformance verification, not re-testing

Canon: reviewer seat (profiles/reviewer.md); rules.md §A.3 (the Ten
Diagnostic Marks live in handbook Part V — referenced, never duplicated);
E.4 EvaluationResult (unparseable verdicts count as loop failures, not passes).

#### 1. Trigger Context & Topological Binding
Progressively load and obey, in precedence order: `/.tmd/rules.md`,
`/.tmd/gravity.md` (the declared sub-graph), `/.tmd/promises.md`,
`/.tmd/glossary.md`. On any cross-file conflict: Conflict Halt.

#### 2. Required Tooling
read, grep, find, ls; bash ONLY for the contract's validation_commands,
executed verbatim. No write/edit — verdicts only.

#### 3. The Procedural Loop (Act → Observe → Exit)

##### Step 1: ACT (assemble the review packet)
- Read: the Task Contract, the diff (`git diff <base>...HEAD --stat` then full), the validation output, the manifold slices named in the contract's inherit block.

##### Step 2: OBSERVE (must_haves → evidence map)
- For each truth (Gherkin scenario): locate behavioral proof in the validation output. No proof = gap.
- For each artifact: run/verify its mechanical check.
- Map every changed path in the diff against the contract's sub_graph write scope. Any out-of-scope path = automatic FAIL (scope violation).

##### Step 3: ACT (rubric pass)
- Evaluate the diff against the Principal Review Rubric / Ten Diagnostic Marks (handbook Part V — read it; do not paraphrase from memory).
- Precision over recall: false positives burn the human gate. Every finding cites file:line and the law violated.

##### Step 4: EXIT PROTOCOL
- Emit the EvaluationResult (E.4): { success, feedback, evidence[], iteration }.
  - success=true requires EVERY must_have evidenced.
  - Any gap → success=false, feedback names the gap and the law.
- Emit the A2A completion payload (E.3) and terminate.

#### 4. Local Negative Constraints
- NEVER fix the diff — a reviewer that edits is a worker with stale context.
- NEVER pass a contract on partially evidenced must_haves.
- NEVER run commands outside the declared validation_commands.
- NEVER review from the worker's session — fresh context is the seat's defining physics.
