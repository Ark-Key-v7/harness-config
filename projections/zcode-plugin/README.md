# zcode-rig (generated — WP-F Phase 4)

Source of truth: `harness-config` (this tree is a projection; `node bin/generate-zcode-plugin.mjs` regenerates byte-identically). Version tracks the rig release.

- `skills/` — the rig skill corpus (namespaced `zcode-rig:` by the plugin loader).
- `agents/` — seat profiles as subagent definitions; pin models after V5 verification.
- `commands/` — `/rig-preflight` (Refinery Stage-0 gate, operator- or ship-gate-invoked). Seats have no command: they are the native subagents in `agents/`.
- `hooks/` — [HARNESS-ENFORCE] fail-closed guards: bash DANGER class + contract write-scope. Canonical law: the authoring repo's extensions + bins.

Install (PORTABILITY step 2c): local marketplace path or git URL; one-time, client-level. Onboarding never copies this plugin — project law only.

Generated from source_head 312231d9cf00.
