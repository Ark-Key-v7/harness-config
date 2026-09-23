# The SDLC Factory: An Operating Map

One narrative map of the factory: the law it runs under, the two frameworks that shape it, every lifecycle stage with its artifact, seat, skills, and gate. Written for the operator, a new contributor, or a fresh agent session.

## Introduction

The factory is a software development system built on one principle: **the human engineers constraints; the agent generates syntax inside them.** Its moving parts — 31 skills, 4 seats, a governance manifold, a nine-layer tool stack, a spec chain — are each documented somewhere. This is the one document answering the Tuesday-morning question: **"I'm staring at a piece of work — what do I invoke, in what order, and why?"**

Without it, three failure modes creep in: the operator becomes the routing layer (the day they forget which skill precedes which, the factory runs wrong until a gate fails); skills become shelf-ware (the wrong skill produces no error, just quietly worse output); and the lifecycle and the skill list drift apart (a future skill lands and nobody knows where it plugs in).

This map is NOT a second routing engine — the rig deliberately rejected a routing skill; the stage pipeline IS the router, and this document is a map for humans, not a dispatcher. It is not rig law — no gates or canon live here. It is not a copy of canon — law is referenced by pointer, never restated, because copies drift.

**How to read it:** the law first (what governs every stage), then the invocation model (how anything fires), then the frameworks, then the stage walk. Each stage = purpose → artifact out → seat → skills → gate → common mistakes.

## Governance: The Law the Factory Runs Under

Two law systems, one per level:

**Rig law (the factory itself).** Lives in the harness-config repo and canon handbooks — machine-level, never copied into projects. Covers skill format, gates, the register, the amendment protocol. Changes only through `rig-change` with your ratification.

**Project law (each product repo): the `.tmd/` manifold.** Five files, placed by onboarding, and the constitution every stage below runs under:

| File | Governs |
|---|---|
| `rules.md` | The negative protocol — forbidden patterns (Anti-Slop law) |
| `gravity.md` | Module boundaries + the Sub-Graph Registry (what each contract may touch) |
| `promises.md` | Temporal law — timeouts, budgets, retry rules |
| `glossary.md` | The ubiquitous language — normative terms, forbidden synonyms |
| `design.md` | Visual law (UI projects) |

Every manifold file has **three zones**: **Zone A** = fixed canon law, verbatim and unchangeable; **Zone B** = project bindings; **Zone C** = the project-specific law **you author** — stack vendors, budgets, registry fills, glossary terms. The spec chain *proposes* Zone C content (compile tables); you author and ratify it; after the lock stamp (`last_verified` = HEAD SHA, committed), Zone C changes only through the Amendment Protocol (a human-ratified PR). **The agent drafts; the human authors law** — that single sentence is the factory's constitution.

## The Invocation Model

Three mechanisms, by design:

**Seats** — four role profiles (`scout`, `planner`, `worker`, `reviewer`) that determine which discipline skills are in force. On **Pi**, a seat is injected every turn (`/seat <role>` switches). On **ZCode**, seats are the plugin's **agent definitions** — spawnable subagent types, each to gain its declared skill set. There is deliberately **no `/build` skill**: building is the worker (or `/develop`) acting under contract. There is deliberately no ship machinery beyond `ship-gate`: deployment is GitOps routing; agents never write deploy scripts.

**Workflow skills (procedural — invoked by name or trigger phrase).** The nine: `/scope`, `/audit`, `/architect`, `/develop`, `/check`, `/test`, `/document`, `/sync`, `/debug`. Plus the specialists: `project-onboard`, `ship-gate`, `rig-change`, `tool-intake`, `template-skill`, `interview-me`, `rules-drift-check`, `webperf-audit`, `to-questionnaire`.

**Discipline skills (bound to seats — fire automatically, never invoked).** Worker: `test-driven-development`, `verification-before-completion`, `context-budget`, `api-and-interface-design`, `security-and-hardening`, `observability-and-instrumentation`, `documentation-and-adrs`, `code-simplification`, `ui-engineering`. Scout: `context-budget`. Planner: `interview-me` gate + task-quality rules. Reviewer: `verification-before-completion`, `rules-drift-check`, review reception rules. All seats: `memory`.

**One mechanical nuance:** Pi enforces discipline firing by per-turn profile injection; ZCode enforces it by agent definition plus description-triggering (the same mechanism that auto-fires `/debug` on failures). Routed on both seats — by different physics.

**Roster laws** (injected with every profile): minimal loadout, fresh context, protocol boundary, the six Core Operating Behaviors.

The anti-pattern, on record: a routing meta-dispatcher was evaluated and rejected — the stage pipeline IS the router.

## Which Run Do I Need? (the selector)

Work arrives as situations, not stages. Find yours; the run chips carry the seat that executes them — **planner** · **worker** · **reviewer** · **operator** (conversational: you and the skill). Seat tags matter on the Pi terminal and headless runs; in a ZCode conversation, you and the skill are the seat.

| # | Situation | When | Run (seat) |
|---|---|---|---|
| 1 | Empty folder, new product | once per product | `git init` → **"onboard this project"** → `/scope` (planner) → `/architect` (planner) → `/develop` (worker) → `/check` (operator) → ship-gate |
| 2 | Live project, new feature | every day | `/scope` "new work…" (planner) → `/develop` (worker) → `/check review` (reviewer) → `/test` (worker) → ship-gate |
| 3 | Inherited code, 80k lines you didn't write | most common · least taught | `/audit` (scout) → `/scope` enroll + plan (planner) → `/develop` (worker) → `/check` (operator/reviewer) |
| 4 | Something broke | any time | `/debug` (worker, off-rail) → `/test` (worker) |
| 5 | Coming back after a break — where was I? | every week, honestly | bare `/scope` (planner) — the roadmap and specs ARE the resume point |
| 6 | Idea too vague to even scope | front of the funnel | `interview-me` first — `/scope` Step 0 routes here on its own |
| 7 | A review found problems | after every review | findings → `/develop` targeted (worker), or `/debug` if it's a real bug → re-review (reviewer) |
| 8 | Performance is off | under load | `webperf-audit` → `performance-optimization` (worker) |
| 9 | A new tool / MCP / skill is needed | gated | `tool-intake` — the only door tools enter through |
| 10 | The factory itself needs a change | rare · critical to do right | `rig-change` — never `/develop`, never ship-gate |
| 11 | Ready to merge and ship | end of every run | `ship-gate` + `/sync` (operator) + `/document` (operator) |

Rows 5 and 7 have no equivalent in other workflows: ours treats state as durable (the files hold the resume point) and findings as input (a review verdict routes work, it doesn't end it).

## The Two Governing Frameworks

The stage walk below is shaped by two frameworks from the canon. Map them once; every stage names its lane.

**The Constraint-Driven Lifecycle** (how work enters and is bounded):

| Framework phase | What it is | Rig stage | Executing skill |
|---|---|---|---|
| Cognitive alignment | Project context established | onboarding + Zone C interview | project-onboard |
| Topological mapping | Boundaries registered | the lock (gravity Registry fills) | project-onboard + you |
| Contract drafting | Work defined as verifiable units | CONTRACT | /scope (slices mode) |
| Gray-box protocol | Human designs interfaces, agent fills internals | BUILD | /develop under contract |
| GitOps amendment | Law evolves by ratified PR only | MAINTAIN | rig-change |

**The Refinery — the CI/CD engine** (how work is proven before merge). Stage 0 is live today; Stages 1–3 are built-but-waiting (they activate when their trigger fires: Stage 1+2 when your first product repo finishes onboarding; Stage 3 with the ephemeral-preview lane). Until each activates, its checks run as local stand-ins you already use:

| Refinery stage | What it does | Status / stand-in until live | Executing skill |
|---|---|---|---|
| Stage 0 — local preflight | Injection-floor + contract lint before every commit | LIVE (`preflight.mjs`) | ship-gate, /check review |
| Stage 1 — deterministic gates | Lint, typecheck, test, build in CI on every PR | waiting; stand-in: gate drivers (`check:fast/task/full`) | /check verify, /test |
| Stage 2 — static analysis + AI review | Full Semgrep lane, PR-Agent reviewing every PR, weekly CodeQL | waiting; stand-in: preflight lane 3 + /check review | /check review |
| Stage 3 — autonomous E2E | Ephemeral preview per PR, Playwright + semantic fallback | waiting; stand-in: /check verify driving the real app | /check verify |
| Stage 4 — human gate | Your review, 24h SLA, then merge | LIVE | ship-gate + you |

## The Lifecycle, Stage by Stage

The walk at a glance:

| Stage | Purpose | Produces |
|---|---|---|
| 1. DEFINE — intent | one screen of pure intent | `specs/intent/<slug>.md` |
| 2. DEFINE — PRD + delta | the falsifiable what | `specs/prd/` + `specs/changes/` records |
| 3. DEFINE — decision | load-bearing choices, made on purpose | decision spec + architecture decision record |
| 4. PLAN | size-capped vertical slices | `specs/plans/<slug>.md` |
| 5. CONTRACT | the executable definition of done | `.agents/tasks/task-*.md` |
| 6. BUILD | the diff, inside scope, under disciplines | working code, migrations applied |
| 7. VERIFY | watched proof, not green checkmarks | the evidence ledger |
| 8. REVIEW | an evidenced verdict, fresh model family | verdict record + PASS marker |
| 9. SHIP | merged, verified, rollback-able | merged PR + deploy verification |
| 10. ARCHIVE | living truth updated | merged domain spec + dated archive |
| 11. MAINTAIN | incidents raise the floor | incident record + ratcheted floor |

Each stage below: **purpose → produces → seat → skills → gate → mistakes.**

### 1. DEFINE — intent
Turn a raw idea into one screen of pure intent. **Produces** `specs/intent/<slug>.md`. **Seat:** operator, conversational with `/scope` (its Step 0 gates to `interview-me` if the ask is underspecified). **Gate:** seven sections complete; `status: approved` only on your explicit approval. **Mistakes:** writing a spec instead of an intent; inventing requirements instead of "TBD — needs validation".

### 2. DEFINE — PRD and delta
The falsifiable *what*. **Produces** `specs/prd/<slug>.md` + `specs/changes/<slug>/delta.md`. **Seat:** operator + `/scope` (spec mode continues). **Gate:** the hypothesis carries a WRONG condition; outcome-shaped metrics; brownfield deltas name existing requirement IDs in the living domain spec; spec lint green. **Mistakes:** a solution-prescriptive problem statement; a PRD deciding engineering (that is `/architect`'s job, next).

### 3. DEFINE — the decision
Load-bearing choices made on purpose, before code. **Produces** a decision spec + an architecture decision record; boundary decisions draft new gravity Registry rows for your ratification. **Seat:** operator + `/architect` (invoked, or reached from a "needs a decision" roadmap row). **Gate:** every acceptance criterion numbered (AC-N); every value in the Value Sourcing table names its source (a value with no source is an undecided input — decide now, never let the build invent it); negative consequences present. **Mistakes:** bundling a whole data model into one accept-panel; deferring a value's source to build time.

### 4. PLAN — slices
Decompose into size-capped vertical slices while it is cheap. **Produces** `specs/plans/<slug>.md`. **Seat:** operator + `/scope` (slices mode). **Gate:** slice caps (≤500 production lines / ≤12 files / ≤1500 total); every slice names the requirement IDs it lands; task-quality gate. **Mistakes:** decomposing after starting; a slice touching two independent subsystems.

### 5. CONTRACT
The executable definition of done. **Produces** `.agents/tasks/task-<slug>-s<N>.md`. **Seat:** planner (or drafted by slices mode). **Gate:** contract lint green; scope resolution succeeds (this arms the sandbox guard); must_haves are Gherkin truths + mechanical artifacts; the `tier:` field sets the verification tail you ratified. **Mistakes:** a contract whose area isn't in the Registry (stop — fix the Registry, never bypass); the builder writing holdout truths.

### 6. BUILD
The diff — inside scope, under disciplines. **Produces** working code with migrations applied and live. **Seat:** worker agent + `/develop` (on ZCode the whole build may be an isolated worker subagent — one contract, one blast radius). **Skills (automatic):** test-first (no production code without a failing test), verification, security, observability, interface design, UI standards — per what the slice touches. **Gate:** the contract's validation commands + the tier's owed tail; goal-backward verification against must_haves; verify steps derived per criterion and per value-source row. **Mistakes:** inventing a decision mid-build (the gate: stop and route to `/architect`, or record the assumption — flagged until ratified); old and new code coexisting; a generated-but-unapplied migration ticked as done.

### 7. VERIFY
Watched proof, not green checkmarks. **Produces** an evidence ledger (URLs, screenshots, request/response pairs, commands + exit codes). **Seat:** operator + `/check verify`. **Gate:** "no evidence, no ✅" — every pass cites a recorded artifact; per-criterion verdicts; one miss fails all. Holdout truths are NOT run here (builder-blind; they belong to review). **Mistakes:** trusting green tests to prove the feature exists; degrading to "looks right in the code".

### 8. REVIEW
An evidenced verdict by a fresh mind. **Produces** the verdict record + findings file + the PASS marker the archive step consumes. **Seat:** reviewer agent — `/check review`, run on a *different model family* than authored the code (never within-family; degrade loudly if only one family exists). **Gate:** deterministic trail first (a blocked preflight is an automatic fail); the target branch's law is read, never the PR's own; every truth evidenced; the holdout run raw; the Ten Marks rubric (handbook Part V — read, never paraphrased). **Mistakes:** reviewing from the author's session; a reviewer that edits; rubric without trail or trail without rubric.

### 9. SHIP
Merged, verified, rollback-able. **Produces** a merged PR + deploy verification. **Seat:** operator + `ship-gate`. **Gate:** the PR description leads with deterministic evidence (`/document` produces that lead); preflight green; your 24-hour gate; a written rollback plan before deploy. **Rig changes take `rig-change` instead — anything under the harness-config repo never rides ship-gate.** **Mistakes:** narrative-only PR bodies; bypassing a check "just this once" (that moment is the rig earning its keep).

### 10. ARCHIVE
Living truth updated; the change becomes history. **Produces** the merged `specs/domains/<domain>/spec.md` + dated archive. **Seat:** `/sync` (it runs the deterministic merger). **Gate:** verified work only (the merger consumes review's PASS marker); no hand-edits to living specs (the guard halts). **Mistakes:** archiving unverified work; editing a living spec by hand.

### 11. MAINTAIN
Incidents make the floor higher. **Produces** incident records + a ratcheted floor. **Seat:** operator + floor tooling. **The loop:** incident → ratchet the floor → optionally a new intent. A bug that reveals missing law proposes a manifold amendment — your pen, via `rig-change` (system evolution: the law learns, not just the code). **Mistakes:** fixing the bug without the ratchet; letting the agent amend law.

## The design.md Walkthrough

`.tmd/design.md` in the rig is a **template framework**, not the final design. Per project: onboarding instantiates the framework; **you author and lock the project's design.md — with the rest of Zone C — before agentic execution begins**. The spec chain *consumes* design.md; it never creates it. "Design" is therefore not a pipeline stage — it is pre-pipeline human work plus the distributed decisions of stage 3 and the seam choices in each contract.

Concrete example, a new web app: you create the folder, `git init`, say *"onboard this project"* — the scaffold places `.tmd/` from templates. You author design.md's Zone C (brand character, composition rules; the actual token values live in the project's CSS/theme system — design.md only points at them) with the rest of Zone C, stamp the lock, commit. `/develop`'s UI track reads design.md as the visual source of truth from the first slice on. (On ungoverned repos, the workflow's own design.md model applies — created on first UI build; on governed projects the manifold's lock order wins.)

## The Shelf: How Skills Enter the Factory

Sources are pinned clones under `~/factory-rig/sources/_intake/`. Adoption is always `template-skill` Import Mode: byte-copy + enumerated edits, a bake-off against the incumbent, provenance in frontmatter — never a fresh fetch, never an ad-hoc install. Worked examples: **adopted** — `code-simplification` (verbatim + enumerated edits, worker-bound); **rejected** — the OpenSpec CLI (a second invocation plane; its change-tracking semantics were rebuilt rig-native instead as the archive merger). The shelf is a disposition record, not a to-do list.

## The Operational Tool Stack

Nine tool layers serve the SDLC stages. Each layer names its tools; "staged" means installed, pinned, and smoke-tested but inert until a governed project invokes it:

| Layer | Tools | What it does | Status | Serves |
|---|---|---|---|---|
| Proof floor | `ripgrep` | deterministic text search every cited claim can stand on | live | every stage's evidence |
| Symbolic editing | `Serena` | edits at symbol level (signatures, definitions) | staged | BUILD |
| Code graph | `codebase-memory` (Graft on standby) | dependency maps and blast radius | staged | CONTRACT, `/debug` |
| Committed truth | `OpenWiki` + `OpenKB` | the docs/knowledge substrate committed with the repo | staged | DEFINE, ARCHIVE |
| Recall — private | `QMD` | your machine's private semantic index | staged | all |
| Recall — public | `Context7` | live library documentation (the only public-docs door) | staged | BUILD, `/architect` |
| Compression | `Headroom` + `Tokenjuice` | token economy for long sessions and terminal floods | staged | long sessions |
| Gates | `DeepSource` (primary), `Semgrep` (fallback), `PR-Agent` (of record), `Betterleaks` (secrets), `VulnHuntr` (scoped), `CodeRabbit` (watch) | the review lane | partially live: `preflight.mjs` (Semgrep floor + Betterleaks) + `/check review` today; the CI lane activates with the first product repo | REVIEW, SHIP |
| Scheduled proof | `Strix` (security campaigns), `Buttercup` (find-and-fix), `OSS-CRS` (skill regression) | nightly and on-demand dynamic lanes | deferred | MAINTAIN |
| Publication | `Docs7` or `Docusaurus` (one per docs property) | publishing the durable knowledge | deferred | post-ARCHIVE |

The one rule: the proof floor *proves*, symbolic editing *writes*, the graph *navigates* — never substituted for each other. Public library documentation enters only through `Context7`. Until a staged layer activates, its work falls back to the seat's own tools — recorded, never silent.

## Starting a New Project (the thirty-second version)

`mkdir` the folder → `git init` → open it in ZCode → say **"onboard this project"** → approve your Zone C fills → stamp the lock → commit → `/scope` ("new work: …"). Tools never install into the project; deferred tools surface as activation notices and install into the factory on your ratification.

## When Something Feels Wrong

- A skill didn't fire → check the seat; disciplines bind to seats, procedures fire on phrases.
- A gate is red → resolve, never force; a block means the scope or the move is wrong.
- Tempted to bypass "just this once" → that is the exact moment the rig is earning its keep.
- Unsure whether it's a rig change → if it touches anything under the harness-config repo, it's `rig-change`.
- A guard blocked a write → the contract's scope is stale or the Registry is wrong; fix the scope, never force the write.

## Appendix: Full Skill Inventory (31)

The nine workflow skills carry a seat-persona: one identity — the seat and the human word in the same token. Specialists and disciplines follow.

| Skill | Class | Fires | Seat · persona | What it does, plainly |
|---|---|---|---|---|
| scope | procedural | invoked: "new work", "plan/slice this" | planner · the challenger | Turns your idea into an ordered plan — and cuts what shouldn't be built before it costs anything; its spec mode interviews and writes the intent/PRD/change records, its slices mode breaks approved work into contracts |
| audit | procedural | invoked: "audit this repo" | scout · the codebase reader | Reads a codebase you didn't write and writes the context files every other skill trusts — describes, never legislates |
| architect | procedural | invoked, or on a needs-a-decision row | planner · the decision-maker | Runs the decision conversation — options with a recommendation, acceptance criteria, a table naming where every displayed value comes from — and writes the record; nothing left to a coin flip |
| develop | procedural | invoked: "build this" | worker · the builder | Builds from spec and contract; refuses to invent what you never decided; every screen ships complete |
| check | procedural | invoked: verify or review | operator verifies · reviewer reviews — the second opinion | Verify drives the real app against the spec; review has a different model family read what was built, findings ranked |
| test | procedural | invoked after verify | worker · the lock | Writes the suite that keeps verify's proof proven — the next change can't quietly break what worked — each test tagged to the criterion it covers |
| document | procedural | invoked: PR / changelog / release note / postmortem | operator · the writer | Writes the human-facing prose from the real diff; never invents a timeline entry |
| sync | procedural | invoked around merge | operator · the reconciler | Brings context files, roadmap, and spec statuses back to the truth, then runs the archive merger |
| debug | procedural | fires on any failure | worker, off-rail · the diagnostician | Reproduces, localizes, tests one hypothesis at a time, fixes at the root, hands back a regression test; two failed theories means escalate to you with a proposal |
| project-onboard | procedural | invoked: "onboard this project" | scout-led, you author | Scaffolds the governance manifold, interviews you for project law, surfaces deferred-tool notices; never commits |
| ship-gate | procedural | invoked: "ship it" | operator + reviewer lane | Drives the change through preflight, PR, your review gate, merge, and rollback |
| rig-change | procedural | invoked: "new rig files" | operator, always | The governed path for any change to the factory itself; your typed confirmation is the last step |
| tool-intake | procedural | on a register trigger, or "adopt this tool" | operator ratifies | Pins, smoke-tests, and registers any new tool — the only door tools enter through |
| template-skill | procedural | invoked: authoring or importing a skill | operator + rig-change | Defines the skill formats and the import/bake-off protocol |
| interview-me | discipline | gates /scope's first step | planner | Extracts real intent one question at a time to high confidence |
| rules-drift-check | procedural | before merge, or inside review | reviewer, advisory | Advises whether the context files still match the code (three drift classes only) |
| webperf-audit | procedural | invoked: performance audit | operator · metric-honest | Severity-rated web-performance findings; never fabricates a metric |
| to-questionnaire | procedural | invoked: the answer lives with someone else | operator | Drafts the questionnaire a third party fills in |
| test-driven-development | discipline | automatic, worker | worker · the red-green law | No production code without a failing test first |
| verification-before-completion | discipline | automatic, all | every seat | No "done" claim without freshly run evidence |
| context-budget | discipline | automatic, all | every seat | Keeps sessions inside the context budget; trims at 75% |
| api-and-interface-design | discipline | automatic, worker | worker | Public contracts get one version, atomic operations, documented changes |
| security-and-hardening | discipline | automatic, worker | worker | Threat-models input, auth, secrets, dependencies; destructive actions need your approval |
| observability-and-instrumentation | discipline | automatic, worker | worker | Production code logs structured, correlated, alertable telemetry |
| documentation-and-adrs | discipline | automatic, worker | worker | Significant decisions get an architecture decision record; missing one is a review finding |
| code-simplification | discipline | after green, or when flagged | worker | Simplifies with behavior exactly preserved; ships as its own change |
| ui-engineering | discipline | automatic, worker, UI | worker | Production-quality, accessible interfaces — not the "AI look" |
| performance-optimization | discipline | automatic on perf work | worker | Measure first; neutral results revert; correctness gates the metric |
| browser-testing-with-devtools | procedural | browser-facing work (tool gated) | operator or worker | Real-browser evidence: screenshots, console, network |
| memory | discipline | automatic, all | every seat | What the agent remembers carries provenance or gets deleted; recall advises, never legislates |
| brainstorming | discipline | before any creative work | every seat | Nothing implements before you approve the design |
