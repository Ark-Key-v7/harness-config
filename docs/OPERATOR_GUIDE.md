# OPERATOR GUIDE — Daily Life with the Factory Rig

_Plain-language companion to the runbook and SOP. Read this once; keep it open
in a tab. Post-restructure paths (v2.1): rig scripts live in `bin/`._

## The mental model

You have three recurring situations. Everything else is detail:

| Situation | You say to Pi | What happens |
|---|---|---|
| New project | "onboard this project" | `project-onboard` skill scaffolds `.tmd/`, `.agents/`, `.pi/`, then interviews you for the Zone C law |
| New task | "new task: <what>" | Contract drafted → validated → scope resolved → you pick a seat → work happens inside guardrails |
| Rig change | "I have new rig files" | `rig-change` skill: place → drivers → your confirmation → commit → push → pull |

## New project (once per repository)

1. `cd` into the project and open Pi.
2. Say **"onboard this project"** — the `project-onboard` skill runs
   `bin/onboard-project.mjs` for you (no commands to remember).
3. The agent then *interviews* you: stack, boundaries, budgets, glossary.
   It drafts, you approve — Zone C is law, so the human authors it.
4. You stamp and commit (the skill prints the exact steps; it never commits).

PRD work happens here too: the PRD's normative content lands in `.tmd/`
(glossary terms, promises, rules), and each buildable slice becomes a task
contract. The PRD is input; the manifold is the law it compiles into.

## New task (the loop you asked about)

A "task" is one unit of work with a finish line — e.g. "auth session CRUD".
The contract is its written definition of done. You don't hand-write these
from scratch; in practice:

Start with `spec-intake` ("new work: <idea>") → it interviews you and drafts
intent + PRD. Then `slice-plan` ("slice the PRD") → plan + drafted contracts,
validated. Then scope + seat as before.

### Fallback: the manual commands

1. In Pi (in the project): "draft a task contract for <thing>" — the agent
   copies the template, fills the YAML, you review.
2. `node ~/.pi/agent/bin/lint-contract.mjs .agents/tasks/task-<slug>.md --gravity .tmd/gravity.md` — valid?
3. `node ~/.pi/agent/bin/contract-scope.mjs --contract .agents/tasks/task-<slug>.md --gravity .tmd/gravity.md --out .pi/scope.json` — this is what arms the sandbox guard.
4. Pick the seat: `/seat worker` (build it), `/seat scout` (explore first), `/seat reviewer` (review after).
5. Work. Out-of-scope writes are blocked automatically — a block means the
   scope is wrong or the move is wrong; resolve, don't force.
6. Done → `/seat reviewer` → "run pr-review".

Steps 2–3 are two commands now; if you want them conversational, that's a
`task-start` skill — same pattern as `project-onboard` (worth adding when the
manual pair starts to annoy you, not before).

## Seats

`/seat` shows status. `/seat worker|scout|planner|reviewer` switches.
`/seat off` clears. The active profile is injected fresh every turn —
edit a profile, next turn sees it.

## Skills available globally (post-v2.1)

`rig-change` · `pr-review` · `tool-intake` · `template-skill` · `project-onboard` · `spec-intake` · `slice-plan`
They live at repo-root `skills/` — discovered by Pi everywhere, seeded into
projects at `.agents/skills/` by onboarding.

## Autonomy (the dial)

Each governed project carries a committed `.agents/autonomy.json` with a
dial position 0–3: **0** — you merge everything · **1** — the agent may
stage, you merge · **2** — auto-merge only when every gate is green, zero
holdout failures, and the watchdog is silent for the ratified window ·
**3** — auto-merge on green structural gates (mutation lane + merge queue
required).

- **Elevation is doctor-gated, never self-declared.** In the project:
  `node ~/.pi/agent/bin/doctor.mjs --require 2` — exit 1 means the project
  does not qualify; the FAIL rows name the exact blocking deficiencies.
  Set the dial no higher than the doctor's verdict, and record who ratified
  it in the file.
- **Demotion is instant** — lower the dial any time, no gate, no ceremony.
- **Headless rules:** unattended workers never compact their context —
  approaching the ceiling they escalate. Every escalation carries a
  proposed answer with rationale; an escalation without one is a defect.

## Rig changes

Anything under `~/factory-rig/sources/harness-config/` = rig law:
edit → run drivers → **you confirm** → commit → push → `git -C ~/.pi/agent pull --ff-only`.
The chain isn't done until the pull fast-forwards. Pi can do all of it via
the `rig-change` skill except the confirmation — that one is yours by design.

## New machine

Hand `docs/PORTABILITY.md` to any chat agent (or follow it yourself):
floor → clone → prove (drivers) → floor tools per `package-pins.json`.
Deferred tools stay deferred until their gates fire.

## When something feels wrong

- A guard blocks you → the contract/scope is stale or the move is wrong.
- Pi startup warns about something → it's telling you a reserved-name
  collision or a config issue; don't click past it, fix the cause.
- You're about to bypass a check "just this once" → that's the exact moment
  the rig is earning its keep. Stop, resolve, proceed.

## Before every commit (product repos)

`node ~/.pi/agent/bin/preflight.mjs --staged` — Refinery Stage 0: Semgrep
injection floor + contract lint. BLOCKED means resolve, never force.
A Betterleaks WARN is a known, tracked gap (register §D.6) — for now.

## Life events that open the register

`docs/CAPABILITY_REGISTER.md` holds every deferred tool and its activation
trigger. Most triggers fire automatically as ACTIVATION NOTICEs when you
onboard a project. Four are life events only you can see — when one happens,
open the register and run `/rig-change`:

1. **First product repo finishes onboarding** → §D.1/§D.2 (CI gates, sandbox).
2. **You adopt any API-billed model** (non-subscription seat) → §D.10 (gateway).
3. **You decide to move to Hetzner** → §D.11 (perimeter) + §D.12 (durability).
4. **A task needs LSP navigation or library docs** → §D.13 (curated MCP stack).

Rule of thumb: if a NOTICE or this list points at the register, the answer
is a rig-change WP — never an ad-hoc install.

## Where does canon live?

`docs/CANON_MAP.md` — the index from every canon section to its rig surface
and its status (LIVE / PARTIAL / DEFERRED / SOP). Canon text itself is never
copied into rig docs; the map is how you find what acts on it.
