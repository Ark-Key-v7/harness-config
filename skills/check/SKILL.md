---
name: check
allowed-tools: Bash, Read, Grep, Glob, Write, Agent
argument-hint: [verify | review]
description: "Confirm a change before merge. `/check verify` drives the real app to prove behavior against the spec (every acceptance criterion met, every surface built). `/check review` runs a senior code review on a fresh model, one that did not write the code. Verify after /develop, review before a PR. Writes to docs/reviews/, never edits code."
metadata:
  author: "Agentic SWE Factory (ported: jsmastery-pro/skills, MIT; absorbs pr-review v1.3.0)"
  class: procedural
  trigger_phrases: ["check", "verify this feature", "run the app and verify", "review this PR", "review the diff", "verify this contract", "stage 2 review", "adversarial review", "fresh eyes review"]
  version: 2.0.0
  provenance:
    source: "jsmastery-pro/skills (skills/check @ 43b69e44c9ca905fe3a3418ccdf4102255e20d40) + rig pr-review v1.3.0"
    method: "byte-copy + enumerated edits; acceptance = source diff (JSM files) + verbatim port (pr-review procedure)"
    edits:
      - "E1 (modes/review.md): Rig review procedure section — pr-review v1.3.0 ported (lanes, base-branch rulebook, trail-first, must_haves→evidence, scope check, holdout run, Ten-Marks pass, reception rule, E.4 + A2A + verified.md exit, D-5 model families, rules-drift option)"
      - "E2 (modes/verify.md Step 0b): governed projects load the task contract's must_haves into the checklist; tier sets the owed tail (D-2); holdouts stay with review"
      - "E3 (review-guide.md): inspection item 9 — governed rubric (Ten Marks via .tmd/rules.md §2 pointer, gravity boundaries, must_haves, holdout; file:line + law citations)"
      - "E4 (SKILL.md, Rig bindings): pipeline contract preserved — E.4/verified.md trail feeds archive-change; ship-gate Step 3 runs this review"
    additions:
      - "E.6 frontmatter metadata block (author, class, trigger_phrases incl. absorbed pr-review trigger surface, version, provenance)"
      - "When NOT to Use section (format v2.0.0 requirement)"
      - "Rig bindings section (WP-F §4.5)"
      - "Procedural form mapping (ACT → OBSERVE → EXIT)"
---

## Output style (plain words, no dashes, no hyphens)

<!-- OUTPUT-STYLE:START -->
Write everything this skill produces, files and messages alike, in plain simple language. Talk to the reader as `you`, warm and direct like a colleague, and present every step as a recommendation they may run or skip, never an order. Keep technical terms that carry real meaning; explain each in plain words. Never use a dash or a hyphen as punctuation: no em dash, no en dash, and no hyphenated compounds. Write `read only`, not `read-only`. Say it in simple words, or reword the sentence. Code, file paths, command flags, and values other skills match on keep their hyphens. Use short sentences, commas, or parentheses. Clear beats clever.
<!-- OUTPUT-STYLE:END -->

## What this skill does

`/check` is the gate before merge. Two modes, separate jobs, usually both, verify first:

- **`verify`** (runtime proof): run the real app and watch the change behave. Proves it works and conforms to the spec (every acceptance criterion met, every specced surface built), which green tests never reveal. Read only on code, no durable files, main thread. Typically after `/develop`.
- **`review`** (fresh model code review): a senior read of the diff on a **different model than wrote the code** (a model reviewing its own output shares its blind spots). Writes findings ranked by severity to `docs/reviews/`. Read only. Typically before a PR.

Neither mode edits code. `verify` points failures at `/debug` or `/develop`; `review` reports findings to fix.

## Pick the mode (route before doing anything else)

First step, before reading any mode file or touching the repo. Look at what followed `/check`:

- **Starts with `verify` (or `run`)** → read `modes/verify.md`, follow it fully. Pass remaining arguments (feature name, scope) through.
- **Starts with `review`** → read `modes/review.md`, follow it fully. Pass the steering through unchanged (e.g. `/check review with opus`, `/check review uncommitted`).
- **No mode word, or ambiguous** (bare `/check`, or a feature name with no mode like `/check auth`) → do NOT guess, do NOT default. Show the two options as a plain text panel and **stop and wait** for the engineer's choice.

**How to present the choice (plain text, works on every agent, no interactive modal):**

Print exactly this, then stop and wait. Do not assume `verify` until they answer. Route on their typed word (`verify` / `review` / `both`).

```
Which check do you want to run? Type one:
  • verify  run the real app and prove the change works against its spec (usually right after /develop)
  • review  a fresh model senior read of the diff, ranked findings (usually right before a PR)
  • both    verify first, then review
```

No interactive picker or modal: a typed choice shown inline behaves the same in every AI tool. (The `argument-hint` frontmatter also surfaces `verify | review` in Claude Code autocomplete; other tools ignore it, which is why this inline panel is the portable path.)

If a feature name came with no mode (`/check auth`), carry it as the target once they pick; still ask the mode.

Do not mix modes in one run. On **both**, do `verify` first, then offer `review` next.

## Portability (any OS, any agent)

Any Agent Skills client on macOS, Linux, or Windows. `git` is the only required CLI. Other shell snippets are POSIX reference, not literal scripts: use your agent's own cross platform file, process, and browser tools. Each mode file adds its own portability notes. No subagent support falls back to inline, noted per mode.

Bundled files: `modes/verify.md`, `modes/review.md`, plus `review-agent-prompt.md` and `review-guide.md` for review. Read only the mode file you routed to; resolve the review bundled files to absolute paths when spawning the reviewer.

## When NOT to Use

- Nothing changed (clean tree, no branch diff, no contract) — there is nothing to verify or review.
- The ask is to fix findings — a reviewer that edits is a worker with stale context; findings go to `/debug` or `/develop`.
- Same session that wrote the code, with no isolated-subagent capability — fresh context is the review's defining physics; a same-session pass is a degraded review and must say so.
- Claiming completion without evidence — `verification-before-completion` (the discipline) binds every completion claim everywhere; this skill is its pre-merge instantiation, not a substitute.

## Rig bindings (WP-F §4.5)

- **Pipeline contract (E4).** This skill is the rig's Stage-4 review surface: on governed projects `review` runs trail-first (preflight BLOCKED = automatic FAIL), executes the pr-review procedure (`modes/review.md`, Rig review procedure), emits E.4 + A2A, and writes the PASS marker (`verified.md`) that `bin/archive-change.mjs` consumes at archive time. `ship-gate` Step 3 and the reviewer seat route here.
- **Verification floor.** Preflight and the verification-before-completion discipline apply at every tier; the contract's `tier:` (D-2) sets the tail above the floor — never the floor itself. A skipped step is recorded as skipped, never absorbed into a pass.
- **Model families (D-5).** Cross-model review resolves GLM ↔ Kimi ↔ configured OAuth families, never within-family; models pin in agent definitions, never here.
- **Browser evidence.** UI-facing verifies drive a real browser where available: `browser-testing-with-devtools` is the tooling skill (§D.24-gated) for DevTools MCP evidence (screenshots, console, network); unavailable → the behavior is `blocked`, never eyeballed to a pass.
- **Law is untouchable.** Review reads the target branch's manifold; it never edits `.tmd/`, code, or any durable file outside `docs/reviews/` (+ `verify.md` ticks + the verified.md marker on governed projects).

## Procedural form (ACT → OBSERVE → EXIT)

- **ACT** — route the mode (verify/review/both; ambiguous → the panel and wait); verify: load spec contract + contract must_haves, calibrate to the approach, run the real app, exercise and record evidence; review: detect + confirm author model, pick the contrasting family, scope the diff, spawn the reviewer with the guide + (governed) the contract packet.
- **OBSERVE** — verify: evidence ledger complete (no evidence, no ✅), per-AC and per-surface verdicts, conformance PASS only when everything is met and present; review: trail inspected first (BLOCKED = FAIL), must_haves evidenced, holdout run raw, findings ranked file:line.
- **EXIT** — tick scope/verify.md only for what actually ran (closing gate: state what you ticked), relay the verdict block, emit E.4/A2A/verified.md on governed reviews, point failures at `/debug` or `/develop`. A fabricated PASS is the one output this skill must never produce.
