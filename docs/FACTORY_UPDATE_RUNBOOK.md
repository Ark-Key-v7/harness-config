# FACTORY_UPDATE_RUNBOOK — Changing the Rig Itself

_The rig's own law: every harness change flows through the one-directional chain — edit source repo → validate → human ratify (§5.4) → commit → push → pull into the read-only clone. The deployed clone (`~/.pi/agent`) is never edited by hand. Pi agents never push the harness._

## The chain (every change, no exceptions)

```
~/factory-rig/sources/harness-config   ← the ONLY working tree you edit
        │  validate (drivers + linters)
        │  stage EXACT paths (never git add -A)
        │  human confirmation (§5.4)
        ▼
   commit → push → git -C ~/.pi/agent pull --ff-only
        │
        ▼  chain is NOT done until the pull fast-forwards
```

The `rig-change` skill operationalizes this inside a Pi session. This runbook is the human-facing contract behind it.

## Change classes and their gates

| Change | Validation gate before commit | Also update |
|---|---|---|
| Extension (`extensions/*.ts`) | its smoke driver in `validation/` | — |
| Tool (`tools/*.mjs`) | every driver that calls it (regression) | — |
| TMD template (`templates/tmd/*`) | `lint-tmd` (template mode) + `tmd` driver + **regenerate projections** + `check-projections` clean | projection bump commit |
| Profile (`templates/agents/profiles/*`) | `lint-profiles` + profiles driver + regenerate projections | — |
| Skill (`templates/agents/skills/*`) | `lint-skills` + skills driver + regenerate projections (routing table changes) | — |
| Task-contract template | contract driver (9 checks) | — |
| Schema / wt.toml | state-hook driver (17 checks) | — |
| Onboarding tool | onboard driver (14 checks) | — |
| Pin (`package-pins.json`) | pi-layer driver; pin advances are ratified individually | FACTORY_STATUS.md |
| Deferred-register status | — | spec §6 row + FACTORY_STATUS.md |
| This runbook / docs | review only | — |

## Full local validation suite

```bash
cd ~/factory-rig/sources/harness-config
for f in validation/*/*.test.mjs; do node "$f" || break; done
node tools/check-projections.mjs        # drift: committed projections == regenerated
node tools/assert-projection-fresh.mjs  # freshness: recorded head == last input-touching commit
node tools/lint-tmd.mjs templates/tmd --agents templates/AGENTS.md
node tools/lint-profiles.mjs
node tools/lint-skills.mjs
node tools/lint-mcp.mjs templates/pi/.mcp.json
```

_Freshness semantics: a projection stales only when its **inputs** (`templates/tmd`, `templates/agents/profiles`, `templates/agents/skills`, the generator itself) advance past the recorded source head. Docs/tools/drivers commits never stale it. If stale: `node tools/generate-projections.mjs && git add projections/pi && git commit -m "Refresh projections"`._

All green is the only acceptable pre-commit state. **Never commit with a failing driver.**

## Placement rules (the mistakes we already made once)

- Downloads crossing Windows→WSL: verify with `ls -la` of the target folder. Watch for lost leading dots (`.mcp.json`, `.gitignore`), `(1)` filename collisions (identify skills by their `name:` field), and `*:Zone.Identifier` stowaways (git-ignored, but check anyway).
- Driver scratch must never be committed — `validation/.gitignore` covers it; `git status --short` before staging.
- Repo layout: rig source lives only in `sources/harness-config/`; outer `~/factory-rig/{tools,validation,tmp}` is the WP0 machine-local floor — never commit from there.

## Rollback

```bash
git revert <sha> && git push && git -C ~/.pi/agent pull --ff-only
```

The clone is pull-only, so rollback is the same chain run in reverse — no special procedure.

## Tagging a release

When all acceptance criteria pass and the four docs are current:

```bash
git tag -a factory-rig-vX.Y.Z -m "..." && git push --tags && git -C ~/.pi/agent pull --ff-only
```
