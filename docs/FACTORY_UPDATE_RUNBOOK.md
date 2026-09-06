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
| Tool (`bin/*.mjs`) | every driver that calls it (regression) | — |
| TMD template (`templates/tmd/*`) | `lint-tmd` (template mode) + `tmd` driver + **regenerate projections** + `check-projections` clean | projection bump commit |
| Profile (`templates/agents/profiles/*`) | `lint-profiles` + profiles driver + regenerate projections | — |
| Skill (`templates/agents/skills/*`) | `lint-skills` + skills driver + regenerate projections (routing table changes) | — |
| Task-contract template | contract driver (9 checks) | — |
| Schema / wt.toml | state-hook driver (17 checks) | — |
| Onboarding tool | onboard driver (14 checks) | — |
| Pin (`package-pins.json`) | pi-layer driver; pin advances are ratified individually | FACTORY_STATUS.md |
| Deferred-register status | — | spec §6 row + FACTORY_STATUS.md |
| Guard extension (`extensions/guard.ts`) | guard-smoke driver + mutation lane | — |
| Gate scripts (`bin/guard\|floor-ratchet\|tripwire\|doctor\|lint-spec.mjs`) | own driver + every driver that calls them | — |
| `templates/specs/*` | spec-smoke driver + regenerate projections | — |
| Mutation lane (`validation/mutations/*`) | mutations runner green (runs in the suite loop) | — |
| This runbook / docs | review only | — |
| Canon revision (new handbook version) | canon-register driver; classification per "Canon revision" below | register + CANON_MAP + FACTORY_STATUS, same commit |

## Full local validation suite

```bash
cd ~/factory-rig/sources/harness-config
for f in validation/*/*.test.mjs; do node "$f" || break; done
node bin/check-projections.mjs        # drift: committed projections == regenerated
node bin/assert-projection-fresh.mjs  # freshness: recorded head == last input-touching commit
node bin/lint-tmd.mjs templates/tmd --agents templates/AGENTS.md
node bin/lint-profiles.mjs
node bin/lint-skills.mjs
node bin/lint-mcp.mjs templates/pi/.mcp.json
```

_Freshness semantics: a projection stales only when its **inputs** (`templates/tmd`, `templates/agents/profiles`, `templates/agents/skills`, the generator itself) advance past the recorded source head. Docs/tools/drivers commits never stale it. If stale: `node bin/generate-projections.mjs && git add projections/pi && git commit -m "Refresh projections"`._

All green is the only acceptable pre-commit state. **Never commit with a failing driver.**

## Placement rules (the mistakes we already made once)

- Downloads crossing Windows→WSL: verify with `ls -la` of the target folder. Watch for lost leading dots (`.mcp.json`, `.gitignore`), `(1)` filename collisions (identify skills by their `name:` field), and `*:Zone.Identifier` stowaways (git-ignored, but check anyway).
- Driver scratch must never be committed — `validation/.gitignore` covers it; `git status --short` before staging.
- Repo layout: rig source lives only in `sources/harness-config/`; outer `~/factory-rig/{tools,validation,tmp}` is the WP0 machine-local floor — never commit from there.

## Canon revision (updated handbook lands)

Trigger phrase: **"canon updated"** / **"new handbook version"** — routes to the `rig-change` skill, which executes this section.

Canon handbooks live OUTSIDE the repo at `~/factory-rig/sources/_canon-handbooks/` (out of agent context; L5 no-chunking). The previous version MUST survive under its own dated filename — it is the diff surface. Never overwrite in place.

1. **Diff old vs new** (works outside any repo):
   ```bash
   cd ~/factory-rig/sources/_canon-handbooks
   git diff --no-index "<old-version>.md" "<new-version>.md"
   ```
   Whole-document reformatting produces noise; the canon's stable §-numbering permits section-by-section comparison. Ignore pure wording churn.
2. **Classify each delta** against rig surfaces:
   - New canon law → new DEFERRED register entry (canon source, activation trigger, prerequisites, integration path) in `docs/CAPABILITY_REGISTER.md`. New canon NEVER auto-implements (§5.4 Meta-Harness).
   - Changed law → amend the affected register entry / CANON_MAP row; audit integrated surfaces (extensions, templates, linters) for contradiction with the new law — contradictions become work packages.
   - Already-covered law → confirm against `docs/CANON_MAP.md`; no-op.
3. **Same-commit bookkeeping** (driver-enforced): register, CANON_MAP, `docs/activation-triggers.json` (only if a new trigger is filesystem-detectable), and FACTORY_STATUS land in ONE commit. `validation/canon-register/` fails on partial updates.
4. **Land via the standard chain** above: drivers green → stage exact paths → §5.4 ratification → commit → push → pull.
5. **Retire the superseded canon file** only after the diff has been fully classified and the commit lands; keep it until then.

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
