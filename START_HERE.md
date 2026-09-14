# START_HERE — Factory Rig Entry Point

_The one file you open when you (or an agent) arrive with no context. It routes;
it never restates law (L5). If a situation is not listed here, it does not exist yet._

## Situation 1 — Fresh machine (build the factory)

The rig is not installed yet. The full recipe lives in **`docs/PORTABILITY.md`**
(floor install, rig clones, tools per `package-pins.json`, validation suites).
Hand this file to the agent and say: *"execute docs/PORTABILITY.md with me."*

Zero-state steps that must happen **before** this repo exists on the machine
(keep them where they survive without a clone — the GitHub repo description,
or your operator notes):

1. Install Node (version per `package-pins.json`) and one agent CLI (Pi and/or ZCode).
2. `git clone git@github.com:Ark-Key-v7/harness-config.git ~/factory-rig/sources/harness-config`
3. Open `START_HERE.md` with the agent and follow Situation 1.

Canon handbooks live as siblings under `~/factory-rig/sources/_canon-handbooks/`
(machine-local; the rig boots without them — law is referenced, not restated).

## Situation 2 — Fresh project (machine is already a factory)

1. `mkdir -p ~/projects/<name> && cd ~/projects/<name> && git init`
2. Place the governance layer:
   `node ~/.pi/agent/bin/onboard-project.mjs --target .`
   (Where the host harness has the rig skills discoverable — Pi does today —
   saying *"onboard this project"* runs this for you.)
3. The agent interviews you for Zone C (stack, sub-graphs, budgets, glossary).
   You approve every fill, stamp `last_verified`, commit.

Full recipe: **`docs/FRESH_PROJECT_SOP.md`**. Brownfield: same, with `--brownfield`.

## Situation 3 — Daily work in a governed project

New task loop, seats, contracts, review: **`docs/OPERATOR_GUIDE.md`**.

## Situation 4 — Changing the rig itself

Author in `~/factory-rig/sources/harness-config` (this repo) via the `rig-change`
skill. Never edit `~/.pi/agent` — it is the read-only, pull-only deployed clone.
Change and secret rules: **`README.md`**.

## Map of the rig

| Artifact | Location |
|---|---|
| Law (canon handbooks) | `~/factory-rig/sources/_canon-handbooks/` (referenced, never duplicated) |
| Machine pins & floor tools | `package-pins.json` |
| Templates (law → projects) | `templates/` |
| Generated projections | `projections/` |
| Skills / procedures | `skills/` |
| Enforcement extensions | `extensions/` |
| Validation drivers | `validation/` |
| Deferred capabilities & triggers | `docs/CAPABILITY_REGISTER.md` |
| Rig state | `docs/FACTORY_STATUS.md` |
| Operator UI notes (Zed/pi-acp, AionUI) | `docs/FACTORY_STATUS.md` § Deferred-tools register |
