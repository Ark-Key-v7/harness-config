---
name: pr-review
description: Execute the agent-adversarial PR review procedure (Principal Review Rubric / Stage gates) against a completed Task Contract. Use when reviewing a PR, verifying a worker's output, or when a contract reaches Stage 2/Stage 4. Requires the Stage-0 preflight trail before the rubric pass.
metadata:
  author: Agentic SWE Factory
  version: 1.2.0
  trigger_phrases: ["review this PR", "verify this contract", "stage 2 review", "adversarial review"]
---

### SKILL: pr-review — conformance verification, not re-testing

Canon: reviewer seat (profiles/reviewer.md); rules.md §A.3 (the Ten
Diagnostic Marks live in handbook Part V — referenced, never duplicated);
E.4 EvaluationResult (unparseable verdicts count as loop failures, not passes).

#### 0. The Review Lanes (one process, stratified — CI/CD Engine §2)
The Refinery and this skill are ONE review process at different levels:
- **Stage 0 (local, live):** `node ~/.pi/agent/bin/preflight.mjs --staged`
  — Semgrep SAST floor + contract lane, before commit (canon §6.3).
- **Stages 1–3 (pipeline, deferred):** Fallow/ESLint/tsc/bun test, PR-Agent
  fresh-context review, E2E preview — factory infrastructure; activation
  triggers in docs/CAPABILITY_REGISTER.md §D.1–§D.3.
- **Stage 4 (human gate, live):** this skill. Canon: review BEGINS ONLY
  after inspecting the full deterministic trail — never rubric-first.

#### 1. Trigger Context & Topological Binding
Progressively load and obey, in precedence order: `/.tmd/rules.md`,
`/.tmd/gravity.md` (the declared sub-graph), `/.tmd/promises.md`,
`/.tmd/glossary.md`. On any cross-file conflict: Conflict Halt.

#### 2. Required Tooling
read, grep, find, ls; bash ONLY for the preflight trail and the contract's
validation_commands, executed verbatim. No write/edit — verdicts only.

#### 3. The Procedural Loop (Act → Observe → Exit)

##### Step 0: ACT (base-branch rulebook reading)
- Read the TARGET branch's manifold (`.tmd/` at the merge-base), never the
  PR branch's — a PR may not smuggle its own standard (v1.3 §5.8 ruling).

##### Step 1: ACT (assemble the review packet)
- Read: the Task Contract, the diff (`git diff <base>...HEAD --stat` then full), the validation output, the manifold slices named in the contract's inherit block.
- **Deterministic trail first:** run `node ~/.pi/agent/bin/preflight.mjs --staged`
  (or inspect the pipeline trail when Stages 1–3 are active). PREFLIGHT
  BLOCKED = automatic FAIL — do not proceed to the rubric on a dirty trail.
  When Stages 1–3 activate, this step consumes the Fallow/Semgrep/PR-Agent
  artifacts instead — the skill does not change, only the trail's origin.

##### Step 2: OBSERVE (must_haves → evidence map)
- For each truth (Gherkin scenario): locate behavioral proof in the validation output. No proof = gap.
- For each artifact: run/verify its mechanical check.
- Map every changed path in the diff against the contract's sub_graph write scope. Any out-of-scope path = automatic FAIL (scope violation).

##### Step 3: ACT (rubric pass)
- Evaluate the diff against the Principal Review Rubric / Ten Diagnostic Marks (handbook Part V — read it; do not paraphrase from memory).
- Precision over recall: false positives burn the human gate. Every finding cites file:line and the law violated.

##### Step 4: EXIT PROTOCOL
- Raw output wins (v1.3 §5.10.3): where your judgment disagrees with a
  mechanical artifact (preflight trail, gate output, holdout run), the
  artifact is the record. Annotate disagreement; never overwrite. Report
  skips as skips. If the contract has a holdout file, run it raw now and
  include its verbatim output.
- Emit the EvaluationResult (E.4): { success, feedback, evidence[], iteration }.
  - success=true requires a GREEN deterministic trail AND EVERY must_have evidenced.
  - Any gap → success=false, feedback names the gap and the law.
- Emit the A2A completion payload (E.3) and terminate.

#### 4. Local Negative Constraints
- NEVER fix the diff — a reviewer that edits is a worker with stale context.
- NEVER pass a contract on partially evidenced must_haves.
- NEVER run commands outside the preflight trail and the declared validation_commands.
- NEVER review from the worker's session — fresh context is the seat's defining physics.
- NEVER substitute the rubric for the deterministic trail, or the trail for the rubric — they are different floors of the same gate.
- NEVER review against the PR branch's manifold — the standard lives on the
  target branch (Step 0).
