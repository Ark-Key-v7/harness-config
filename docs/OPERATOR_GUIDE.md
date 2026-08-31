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

`rig-change` · `pr-review` · `tool-intake` · `template-skill` · `project-onboard`
They live at repo-root `skills/` — discovered by Pi everywhere, seeded into
projects at `.agents/skills/` by onboarding.

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
