---
name: research
allowed-tools: Read, Grep, Glob, Write, Agent
description: "Run /research to answer a question with evidence before building: internal sources first (committed truth, memory, codebase), then Context7 for library docs, then web search as fallback. Produces a findings artifact with claims at calibrated strength, sources, and open gaps. No implementation while it runs."
metadata:
  author: "Agentic SWE Factory (CF46 intake: mechanisms from ClaudeFast v4.6 deep-researcher + session-types/research, re-voiced; source license unverified — near-zero verbatim text)"
  class: procedural
  trigger_phrases: ["research", "research this", "find out", "look it up", "compare options", "what is the current best", "evidence for", "investigate before building"]
  version: 1.0.0
  provenance:
    source: "CF46 intake 2026-09-29 (ClaudeFast v4.6: deep-researcher agent, session-management session-types/research.md)"
    method: "import-mode re-voice — mechanisms adopted, expressed in rig voice; vendor/tool wiring discarded"
    edits:
      - "E1: source ladder rebuilt rig-native (L3 committed truth → memory with provenance → Context7 L4 → web search), exhaust-internal-before-external law"
      - "E2: calibrated evidence language + source credibility/recency standards as findings law"
      - "E3: five binary research-handoff gates before findings may inform a decision"
      - "E4: subagent fetch economy per context-budget law; scout seat binding (CF46)"
    additions:
      - "When NOT to Use section (format requirement)"
      - "Procedural form mapping (ACT → OBSERVE → EXIT)"
---

## What this skill does

**Your role:** the evidence engineer. Answer a question the codebase and your memory cannot already answer, at a strength the evidence actually supports, and leave a findings artifact another seat can act on without re-asking. Research produces understanding, not code: no implementation happens while this skill runs — if the findings demand a build, that is the next run, pointed at this artifact.

A run is a loop over sources, not a single search: exhaust what you already have before fetching anything new, evaluate every source before trusting it, and end with claims whose confidence matches their evidence.

## Asks vs acts

**Acts.** It frames the question, sweeps internal sources, fetches external ones, evaluates, and writes the artifact. It **asks** when the question itself is ambiguous (what decision does this feed? what would "answered" mean?), because researching the wrong question is the most expensive failure here.

## Artifact ownership

Owns the findings artifact: `docs/research/<YYYY-MM-DD>-<topic>.md` (create the directory if needed; on governed projects, findings that feed a decision may live beside the spec's `rationale.md` — the spec owner is `/architect`). Does not write code, specs, or law.

## When NOT to Use

- The answer already sits in committed truth (docs, specs, ADRs) and one read settles it — read it, cite it, skip the ceremony.
- The question is a codebase question (where is X, how does Y work here) — that is `/audit` or a scoped scout run.
- The decision is already made and ratified — the spec is the record; research after the fact is narrative, not evidence.
- The need is a library API detail during a build — that is Context7 mid-task (context-budget law), not a research run.

## Execution

### Step 0: Frame the question (ACT begins)

Write down, before any source is opened:
- **The question, verbatim** from the operator (roster law 7) — plus what decision the answer feeds and when it is needed.
- **Success criteria**: what an answer must contain to be actionable.
- **Scope**: what is in and out (versions, platforms, time frame).

If the operator gave only a topic, ask once for the decision it feeds — research without a consumer produces archives, not answers.

### Step 1: Internal sweep (exhaust before you fetch)

In priority order, per the recall jurisdictions:
1. **Committed truth** (L3): project docs, specs, ADRs, prior research artifacts.
2. **Memory** (M1/M2): QMD over the memory roots; cite provenance lines; `verified` outranks drafts.
3. **Codebase patterns**: how this problem was solved here before (grep, scoped `rg`).

Rule: **exhaust internal sources before going external.** Project-specific evidence outranks generic solutions, and what you already trust is cheaper than what you must vet. Record what was searched and what was found (or explicitly not found) — the negative result is part of the answer.

### Step 2: Library docs — Context7 (L4)

Framework and API questions go to Context7, the only public-docs door. Run the fetch in a cheap subagent and relay only the condensed, relevant extract (context-budget law). Verify the doc version matches the project's pinned version — the right answer to the wrong version is a wrong answer.

### Step 3: Web search (the fallback, not the default)

Only when internal and Context7 are exhausted or insufficient. Prefer official documentation and maintainer publications; weigh recency explicitly (frameworks churn; a 2024 answer may be a 2026 bug). Multiple searches with different phrasings beat one. Track every source's URL and date as you go — reconstruction later is fabrication risk.

### Step 4: Source evaluation

Every source gets weighed before its claim gets used:
- **Credibility**: official docs > maintainer-published > established industry sources > individual posts. Note which tier each claim rests on.
- **Recency**: when published vs the versions in play.
- **Consensus**: one source is a lead, not a finding — cross-reference anything load-bearing. Where sources disagree, record the disagreement; do not silently pick a winner.

### Step 5: Synthesis — the findings artifact

```markdown
# Research: <question>, <YYYY-MM-DD>

**Feeds**: <the decision/feature this answers for>
**Verdict**: <the answer, stated at its evidence strength>

## Findings
- <claim> — <evidence: source + date, or file:line> — <confidence>

## Conflicting evidence
<where sources disagree, and which reading this project's context favors, and why>

## Gaps and unknowns
<what could not be established, and what would settle it>

## Recommendation
<what to do, with confidence level — or "insufficient evidence, decision needs the operator">
```

**The language law — claims at evidence strength (CF46):**

| Phrase | Licensed when |
|---|---|
| "Multiple sources indicate…" | consensus across independent sources |
| "Evidence suggests…" | strong but not definitive |
| "Limited evidence available…" | found something, inconclusive |
| "Conflicting evidence exists…" | sources disagree — show both |
| "Recent developments suggest…" | emerging, may change |

A claim written stronger than its evidence is the research equivalent of an uncited scout claim — a hallucination candidate that fails review.

### Step 6: Handoff gates (only when findings feed a decision)

Before the findings may drive a decision or a build, all five hold:
1. **Completeness** — all major options evaluated with sufficient evidence.
2. **Decision confidence** — a clear recommendation with an appropriate confidence level.
3. **Implementation readiness** — enough specifics that the consuming seat can proceed.
4. **Risk awareness** — identified risks with mitigations.
5. **Success metrics** — how the implemented choice will be judged.

A failed gate is stated in the artifact ("gate 3 fails: no migration path evaluated"), not papered over — the decision-maker decides with the gap visible.

## Procedural form (ACT → OBSERVE → EXIT)

- **ACT** — frame the question, sweep internal sources, fetch external (subagent economy), evaluate sources, write the findings artifact.
- **OBSERVE** — every claim carries source + date (or file:line) at calibrated strength; conflicting evidence mapped; gaps named; handoff gates checked and stated.
- **EXIT** — relay the verdict line + artifact path; point the consumer at the artifact (never re-summarize the whole thing into chat); if implementation follows, it is a new run referencing this artifact. Research that quietly turned into building is a scope violation — stop and route.

## Rig bindings

- **L4 jurisdiction**: Context7 is the only public-docs door; web search supplements it, never replaces it (stack flow law). Tool availability is seat- and harness-dependent — when an external tool is unavailable, that finding is `blocked` with what would settle it, never guessed (recorded, never silent).
- **Memory (M1)**: durable research conclusions enter memory as DRAFT entries through compaction, verified by the human path — never self-written as verified.
- **Scout seat**: bound to this skill via `skill_bindings.invocation` (CF46); the scout executes it inside its read-only boundary, findings artifact emitted through the orchestrator.
- **Promotion**: a research conclusion that keeps proving load-bearing routes to a spec/ADR through `/architect` — research advises, law is human-ratified.
