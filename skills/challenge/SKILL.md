---
name: challenge
allowed-tools: Read, Grep, Glob, Write, Agent
description: "Run /challenge on a drafted spec, PRD, or plan before ratification: extract its assumptions (verified, assumed, and unstated), rank them by blast radius × uncertainty, and settle the top ones through /investigate within a capped budget. Verdicts land in the spec's rationale.md so ratification happens with the load-bearing doubts already answered. No implementation; never edits the spec."
metadata:
  author: "Agentic SWE Factory (rig-native 2026-09-30, operator directive; no upstream source)"
  class: procedural
  trigger_phrases: ["challenge this", "challenge the spec", "what are we assuming", "find the assumptions", "stress-test the plan", "before I ratify"]
  version: 1.0.0
  provenance:
    source: "rig-native design (operator directive 2026-09-30); reuses investigate's evidence law and task-quality's completeness bar"
    method: "authored in rig voice from the operator's 'true assistant' brief: an agent that finds the questions worth asking and answers them without waiting to be told"
---

## What this skill does

**Your role:** the assumption auditor. Every gate in the factory checks work the operator directed; this skill generates the questions. A spec is a stack of claims, and the ones nobody noticed making are the ones that ratify into law and surface three stages later as redesign. Challenge reads a draft the way a hostile reviewer would, converts its load-bearing doubts into investigate briefs, and returns verdicts — so the operator ratifies with the questions already answered, not still unasked.

**Position in the chain:** `architect → challenge → ratify`. It runs after a spec/PRD/plan is drafted and before the operator's ratification; verdicts are input to that ratification, never a replacement for it.

A run produces understanding, not code: no implementation happens while this skill runs, and the spec itself is not edited — only the verdict record beside it.

## When NOT to Use

- Nothing is drafted yet — there is nothing to challenge; that is `/scope` or `/architect` territory.
- The build already started — the assumptions are now code; that is `/check review` with its quality lenses.
- The question is about existing code behavior — `/audit` or a direct `/investigate` run, no ceremony.
- The concern is performance or security of something built — the review-guide lenses, not assumption mining.

## The three claim classes

| Class | Marker | Danger |
|---|---|---|
| **Verified** | cites evidence (spec section, ADR, measured number, findings artifact) | none — treat as settled |
| **Assumed** | marked `assumed decision (spec NNNN)` / flagged owing ratification | tracked — but tracked ≠ tested |
| **Unstated** | nothing — the claim is invisible because nobody noticed making it | the entire point of this skill |

Unstated claims hide inside ordinary sentences: "will use the existing auth", "supports 10k concurrent", "the vendor API allows this", "never needs to run offline". They are found by mining verbs, not by reading sections.

## Execution

### Step 1: Claim mining (ACT begins)

Read the draft whole — spec, PRD, plan, and their referenced rationale. Then walk it and extract every falsifiable claim:
- **Commitment verbs**: will, uses, supports, handles, allows, guarantees, never, always.
- **Inheritance claims**: "the existing X covers this", "the vendor permits this", "no migration needed".
- **Scale and shape claims**: latency, volume, concurrency, data shape, compatibility windows.

For each claim record: its class (above), **blast radius** (if wrong, what must change — a task? a contract? the architecture?), and **uncertainty** (does anything in the repo, memory, or cited docs point at evidence? nothing pointing = high). Dedupe aggressively: one root assumption beats three of its symptoms.

### Step 2: Rank

Order by blast radius × uncertainty. Take the top **5** — the budget, per run. An assumption that would force an architecture change and has zero evidence behind it outranks a task-level doubt with partial coverage. List the cut beyond five in the report as "untested this run" — never silently dropped.

### Step 3: The loop contract

Each ranked assumption becomes one `/investigate` brief. The brief carries (roster law 7 applies to the originating draft, and the question must be verbatim-sharp):
- the assumption, stated as a falsifiable question — "the Stripe API supports idempotency keys on this endpoint" → "does Stripe's documented contract guarantee idempotency on POST /v1/payment_intents?"
- the decision it feeds (which spec claim, which contract)
- the falsifier: what evidence would make the claim false
- what "settled" means (success criteria, per investigate Step 0)

Dispatch through `/investigate` — it is the only inquiry door (source ladder, calibrated language, subagent economy). Independent questions may run in parallel; dependent ones sequence. Verdicts, per assumption:
- **Confirmed** — evidence found, at its calibrated strength (confirmed ≠ proven; the language law applies)
- **Refuted** — evidence contradicts the claim → **halt further tests downstream of it** and surface immediately; anything built on a refuted assumption is renegotiating with reality
- **Untestable at budget** — name exactly what would settle it and who holds that

Stop conditions: the 5-assumption budget; a refutation on a load-bearing branch; or the completeness bar — **no major architectural questions remain** (task-quality's bar, promoted from review to inquiry).

### Step 4: Verdict record + report (EXIT)

Append to the draft's `rationale.md` (owned by `/architect`; this skill owns only this appended section, never the spec body):

```markdown
## Assumption verdicts (challenge run YYYY-MM-DD)

| # | Assumption | Class | Verdict | Evidence | Action |
|---|---|---|---|---|---|
| 1 | <claim> | unstated | refuted | findings artifact path | spec must change |
| 2 | … | assumed | confirmed at limited strength | <artifact>#section | none |
| 3 | … | verified | (skipped — already cited) | spec §R3 | none |
```

Then report:
- verdict counts: confirmed / refuted / untestable / untested-this-run
- any **refuted** assumption called out first: "spec must change before ratification" — the ratification gate now has teeth
- the rationale.md path; the operator ratifies (or re-drafts via `/architect`) with the record in hand

The skill never ratifies, never edits requirements, never marks a spec ready. Law is human-ratified; verdicts are evidence.

## Procedural form (ACT → OBSERVE → EXIT)

- **ACT** — mine claims, classify and rank, cut to budget, dispatch investigate briefs, collect verdicts.
- **OBSERVE** — every verdict cites a findings artifact at calibrated strength; refutations halt downstream work immediately; the untested tail is listed, not hidden.
- **EXIT** — append the verdict record to rationale.md, deliver the report, stop. Challenge that quietly started re-drafting the spec is a scope violation — route back to `/architect`.

## Rig bindings

- **Chain position**: `architect → challenge → ratify` — advisory machinery; the ratification gate stays the operator's (the Meta-Harness principle applied to inquiry).
- **Investigate door**: all evidence gathering runs through `/investigate` (scout-bound) — no ad-hoc fetching on the main thread, subagent economy per context-budget law.
- **Write scope**: rationale.md append only. Never the spec, never code, never law.
- **Dial-0 lawful**: the whole run is read-only inquiry; it needs no autonomy-dial elevation. Autonomy of inquiry is a separate axis from autonomy of execution.
- **Promotion**: a pattern this skill keeps catching (a claim class its mining missed, a lens that would have found it) routes back into its own lens list via rig-change — the skill is deliberately versioned to grow from misses.
