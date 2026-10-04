---
name: sentinel
allowed-tools: Read, Grep, Glob, Bash, Write
description: "Run /sentinel to poll a governed product's live data for signals and bring the operator decisions, not actions. Reads the product's declared signal contract (views plus observability API), analyzes what fires, and produces a decision brief with an evidence pointer on every claim. Stops at the human gate: it proposes, the operator disposes. Never writes to the product, never auto-remediates."
metadata:
  author: "Agentic SWE Factory (rig-native 2026-10-03, operator directive; no upstream source)"
  class: procedural
  trigger_phrases: ["sentinel", "run the sentinel", "what needs attention", "check product signals", "scan for signals", "decision brief", "anything fire"]
  version: 1.0.0
  provenance:
    source: "rig-native design (operator directive 2026-10-03): the operator-facing agentic loop with a human gate, reading a governed product's live data. First consumer: Cartograph TCE phase 14; the product half of the contract is that project's phase-14 spec"
    method: "authored in rig voice; consumes the product's signal contract, the operator plane's evidence sources (database MCP, observability API, eval scripts), and routes approved work through the rig's own gates"
---

## What this skill does

**Your role:** the operator's watchman. A governed product is live, and its
data moves without anyone watching. The sentinel wakes on request or on the
operator's schedule (the automation names this skill), reads the product's
attention set — the signals the product itself publishes — and turns
anything that fires into a decision brief. It reads, it reasons, it
recommends. It never fixes, never writes to the product, and never closes
its own loop: the operator is the gate.

```
THE GUARDRAIL (this skill's whole character):
read-only + propose-only. The sentinel's only output is a brief.
Every action it names waits for a typed operator decision, and
approved work re-enters through the rig's own gates (/scope,
/architect, /develop) — never around them.
```

## When NOT to Use

- The product has no signal contract — nothing declares its views, its
  observability read, or what a signal row carries. Wire the contract
  first (a phase spec in the product owns that); a sentinel guessing where
  evidence lives invents findings.
- The question is a one-off investigation — `/investigate` directly; the
  sentinel is the scheduled loop, not an inquiry wrapper.
- The finding already needs building and the operator knows it — `/scope`
  with the brief attached; the sentinel does not plan work.
- Scoring the product's AI quality — the eval harness and eval scripts own
  that; the sentinel reads their scores, it never produces them.

## Asks vs acts

**Acts:** poll, pull, analyze, brief, route. **Asks:** once at intake, only
if the target is ambiguous (which project or deployment); and once per run
at the gate. The gate is not a question the sentinel answers for itself —
every brief ends with options, one recommendation, and the exact decision
needed. The typed decision is the operator's.

## Artifact ownership

Nothing, by default. The brief lives in the conversation. On an explicit
operator ask it persists to `<project>/docs/sentinel/<date>-<slug>.md` as
operator notes — not product law, not committed product docs. The sentinel
never writes to product tables, product code, or product configuration.

## The signal contract

Read, never assumed. At intake, locate the product's signal declaration —
the spec that names its attention-set query, its observability-plane read,
and what each signal row carries (Cartograph TCE: `docs/specs/phase-14.md`,
three views plus one API read). If the contract is missing, or its queries
fail, report that as the finding and stop: an absent contract is itself
attention-worthy, and a sentinel that improvises a query surface invents
structure — the same failure the product exists to prevent.

## Execution

### Step 0: Intake (ACT)

Identify the target project and read its signal contract. Completion
criterion: the contract is located, the connection method for each plane is
known (database MCP or psql for the views; the observability API for eval
signals), and the run's scope is on record (full attention set, or one
signal class).

### Step 1: Poll the attention set (ACT)

Run the contract's entry queries exactly as declared — the view union plus
the API read. Do not reach past the contract except for the drill-down a
firing signal's evidence pointer names. **Empty set → one line: nothing
needs attention, then EXIT.** A quiet run never gets padded into content.

### Step 2: Pull evidence (ACT)

For each firing signal, pull what its pointer names: the run, the analysis,
the coverage breakdown, the trace, the score history. A signal without a
resolvable evidence pointer is reported as a contract defect, not analyzed.

### Step 3: Analyze (OBSERVE)

Judge each signal against the contract's thresholds and its own history:
new or recurring, worsening or stable, isolated or systemic. Name the
likely cause where the evidence supports one; say unknown where it does
not. No invented structure: the sentinel reasons over the product's facts
only — the same rule the product applies to its own AI.

### Step 4: The decision brief (ACT)

One brief per run, all signals in it:

- **Finding** — one line per signal.
- **Evidence** — rows, ids, trace links; every claim cites.
- **Why it matters** — the cost of leaving it alone.
- **Options** — two or three, each with cost and risk.
- **Recommendation** — one, with the reason.
- **Decision needed** — the exact question, answerable in a line.

No brief without a decision needed.

### Step 5: The gate (OBSERVE)

Stop. Present the brief. The operator's typed decision is the only thing
that moves work forward; silence, ambiguity, and "later" mean nothing
runs. This step has no fallback and no timeout.

### Step 6: Route the decision (ACT)

On an explicit decision: an operational act (re-run an analysis, adjust a
threshold) executes as directed, with the exact command shown before it
runs; build work routes to `/scope` with the brief attached. Report what
was routed where. **EXIT when every firing signal has a recorded
disposition — acted, routed, or deferred by the operator.** Nothing else
terminates the loop.

## Local Negative Constraints

- Never write to the product's database, code, or configuration. The only
  file the sentinel ever writes is the optional brief archive, on request.
- Never execute a state-changing action before the operator's typed
  decision for *this* run; a past approval never authorizes a new one.
- Never cite evidence you did not pull. A claim without a pointer is a
  fabricated brief.
- Never analyze a signal whose evidence failed to load — report the defect
  instead.
- Never route work around the rig's gates because the brief feels urgent.
- Never fill a quiet run: empty is empty, and saying so is the whole report.
