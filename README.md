# The Software Factory

This repository is the source of truth of a software factory: a governed
software development lifecycle that runs through coding-agent harnesses —
Pi on the terminal, ZCode on the desktop — as skills, seats, gates, and law.

Its constitution is one sentence: **the human engineers constraints; the
agent generates syntax inside them.** Every mechanism here exists to make
that sentence hold at scale, so that one piece of work or ten parallel ones
arrives at merge proven, reviewed by a fresh model, and merged only by a
human who saw evidence.

## What runs here

- **34 skills.** Nine workflow skills a human invokes by name — `/scope`,
  `/develop`, `/check`, `/test`, `/debug`, and their siblings. Specialists
  that gate specific moments — `project-onboard`, `ship-gate`, `rig-change`,
  `tool-intake`, `investigate`, `ops-journal`. And disciplines bound to seats
  that fire automatically: test-first, security, verification-before-completion,
  memory.
- **Four seats.** Scout, planner, worker, reviewer. On ZCode they are
  subagent definitions; on Pi, per-turn injected profiles. The seat decides
  which law is in force.
- **The governance manifold** (`.tmd/`). Five files of project law — rules,
  gravity, promises, glossary, design — placed by onboarding, authored by
  the human, amendable only by a ratified PR.
- **The spec chain.** Intent → PRD → decision → plan → task contract: work
  becomes an executable definition of done before code exists.
- **Gates.** A local preflight (Semgrep floor + contract lane), a
  deterministic trail, holdout truths the builder cannot see, a review on a
  different model family than wrote the code, and a merge that stays human.
- **Projections.** The same corpus rendered per host: the active Pi clone
  (`~/.pi/agent`) and the agentic-swe-factory plugin the ZCode client installs from
  the local marketplace.

## A piece of work, end to end

> "onboard this project" → `/scope` ("new work: …") → `/develop` →
> `/check verify` → `/test` → `/check review` → `ship-gate` → `/sync`

Start here for everything else — which run for which situation, what each
seat owes, where every gate lives:
**[docs/SDLC_FACTORY_OPERATING_MAP.md](docs/SDLC_FACTORY_OPERATING_MAP.md)**.
Where canon law is enforced:
[docs/CANON_MAP.md](docs/CANON_MAP.md). Moving the factory to a new machine:
[docs/PORTABILITY.md](docs/PORTABILITY.md). Current state and landings:
[docs/FACTORY_STATUS.md](docs/FACTORY_STATUS.md).

## The rules that hold it up

- **Law changes by ratification only.** Changes to this repository go
  through `rig-change` — the agent drafts, the human turns the key. Tools
  enter only through `tool-intake`; skills are adopted by `skill-authoring`
  import with a bake-off, never ad-hoc.
- **No evidence, no done.** Every claim cites a freshly run artifact.
  A fabricated pass is the one output this factory must never produce.
- **The chain is the deployment.** Never edit the active clone: change the
  authoring copy, commit, push, pull into `~/.pi/agent`, run the gates.
- **Secrets never enter.** No tokens, API keys, session files, trace
  ledgers, or generated credentials in this repository — runtime secrets
  live outside it (`~/.pi/secrets/`, mode `0700`).

## Layout

| Path | Holds |
|---|---|
| `skills/` | the factory's skills (projected verbatim into the hosts) |
| `templates/` | the `.tmd/` manifold, spec chain, contracts, seat profiles, hook sources |
| `bin/` | the deterministic machinery — preflight, linters, contract scoping, archive merger, projection generators, plane checks |
| `extensions/` | fail-closed guards: bash, sandbox, write-scope, seat |
| `projections/` | generated host surfaces — regenerate with `bin/generate-*.mjs`, never hand-edit |
| `validation/` | the drivers that prove the machinery does what it claims |
| `docs/` | the operating map, canon map, capability register, status ledger |
