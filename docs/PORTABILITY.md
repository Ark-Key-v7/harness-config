# PORTABILITY — Moving the Factory Rig to a New Machine

_What survives a machine change, what must be rebuilt, and in what order. The rig is portable by construction: everything that matters is either in git or regenerable from `package-pins.json`._

## What travels (in git, pulled from GitHub)

- The entire rig source: extensions, tools, templates, validation drivers, projections, docs, `package-pins.json`.
- The deployed clone layout: `~/.pi/agent` is simply a clone of the repo.

## What does NOT travel (machine-local, rebuild on arrival)

| Layer | Location | Rebuild |
|---|---|---|
| Node 24.18.1 | `~/.local/node/` | install per pins |
| Pi 0.84.3 | npm global | `npm i -g @earendil-works/pi-coding-agent@0.84.3 --ignore-scripts` |
| Kimi OAuth session | `~/.pi/` auth state | re-authenticate (`pi` login flow) |
| Factory floor (worktrunk, qmd, lancedb, semgrep, betterleaks, fallow, pr_agent) | `~/factory-rig/tools/` etc. | install per `package-pins.json` — versions and sha256/integrity hashes are recorded there; verify before use |
| Rig state files | `~/.pi/agent/*-state.json`, logs | regenerate on use (memory toggles, seat state are per-machine by design) |
| Deferred tools | — | NOT installed at onboarding; each activates when its register gate fires (spec §6) |

## Onboarding sequence (fresh machine)

```bash
# 1. Floor
#    Install Node 24.18.1, then Pi:
npm i -g @earendil-works/pi-coding-agent@0.84.3 --ignore-scripts
#    Authenticate Kimi OAuth (subscription regime).

# 2. Rig
mkdir -p ~/factory-rig/sources
git clone git@github.com:Ark-Key-v7/harness-config.git ~/factory-rig/sources/harness-config
git clone ~/factory-rig/sources/harness-config ~/.pi/agent   # or clone from GitHub directly

# 3. Prove the rig
cd ~/factory-rig/sources/harness-config
for d in validation/*/; do node "$d"*.test.mjs || break; done   # all suites green
node tools/check-projections.mjs                                # drift clean

# 4. Floor tools per package-pins.json (exact versions, verify hashes, --ignore-scripts)

# 5. Pull-chain sanity
cd ~/.pi/agent && git pull --ff-only   # already current = chain works
```

## Environment assumptions (portability boundary)

- Windows + WSL2 Ubuntu 24.04 is the reference platform. The rig itself is Linux-portable; Windows-specific notes are limited to the download-boundary hazards (dotfiles, `(1)` collisions, Zone.Identifier).
- Kimi OAuth subscription regime is assumed. The gateway regime is deferred; activating it is a register-gated change, not a portability concern.
- No deferred tool is required for the plane to function — the rig boots and governs without them.

## Project repos

Product repositories onboard per `FRESH_PROJECT_SOP.md` — their governance layer (`.tmd/`, `.agents/`, `.pi/`, `AGENTS.md`) lives in *their* git history, so they port independently of the rig machine.
