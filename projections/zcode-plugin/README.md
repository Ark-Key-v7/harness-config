# agentic-swe-factory — the Software Factory on ZCode

This plugin is the factory as you install it on this host: the skills you
invoke, the seats that execute them, and the fail-closed hooks that keep
every session inside the law. The full story — every stage, seat, and gate —
lives in the source repo's **docs/SDLC_FACTORY_OPERATING_MAP.md**.

- `skills/` — the rig skill corpus (namespaced `agentic-swe-factory:` by the plugin loader): nine workflow skills you invoke by name, specialists that gate specific moments, and seat disciplines that fire automatically.
- `agents/` — the four seats (scout, planner, worker, reviewer) as subagent definitions; the seat decides which law is in force.
- `commands/` — `/rig-preflight` (Refinery Stage-0 gate, operator- or ship-gate-invoked). Seats have no command: they are the native subagents in `agents/`.
- `hooks/` — [HARNESS-ENFORCE] fail-closed guards: bash DANGER class + contract write-scope. Canonical law: the authoring repo's extensions + bins.

Install (PORTABILITY step 2c): local marketplace path or git URL; one-time, client-level. The factory updates this plugin on every rig pull — never edit it here; it regenerates byte-identically from `harness-config` (`node bin/generate-zcode-plugin.mjs`). Onboarding never copies this plugin — projects get law only.

Generated from source_head 1f0e8ef5afab.
