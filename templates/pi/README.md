# Project-local `.pi/` layer (WP8)

This directory is the committed, project-local Pi layer. A fresh project
copies this template verbatim to `<project>/.pi/` and boots Pi with **no
manual configuration** (WP8 acceptance).

## Contents

| File | Law | Notes |
|---|---|---|
| `settings.json` | Stripped WP3 projection — `_`-prefixed meta keys removed (v1.2 §2.4) | Project-local extensions/packages go here, never in the rig clone |
| `.mcp.json` | Curated, pinned MCP servers only; **empty is valid** (v1.2 §2.11) | Validated by `bin/lint-mcp.mjs` |
| `.gitignore` | `scope.json` + `memory.md` are never committed | scope.json is a resolved artifact; memory.md is telemetry |

## What does NOT live here

- `scope.json` — generated per Task Contract by
  `node ~/factory-rig/sources/harness-config/bin/contract-scope.mjs --contract <task.md> --gravity .tmd/gravity.md --out .pi/scope.json`.
  Absent = sandbox guard inert (WP2 design); resolved = enforced.
- `append-system.md` — the WP3 projection is injected at onboarding (WP10),
  not stored as a second copy here (L5: reference, don't duplicate).
- Project-local guards — wire them via `settings.json` `extensions`.

## MCP curation law (v1.2 §2.11 — binding rulings)

1. Client half is `pi-mcp-adapter` (pinned in `package-pins.json`) — adopted,
   not built. One `mcp` proxy tool with on-demand search/describe/call.
2. `directTools` promotion is for hot paths only; `freezeDirectTools` keeps
   the prompt cache stable.
3. **stdio transport is the default.** HTTP only when a second concurrent
   consumer is named.
4. Protocol negotiation is pinned per server.
5. Zero new dependencies on deprecated Roots/Sampling/Logging
   (MCP 2026-07-28).
6. Every server entry is exact-pinned (`name@x.y.z` — never `latest`, never
   a bare name) and must pass `node bin/lint-mcp.mjs .pi/.mcp.json`.

Adding a server is a rig change: run it through the `tool-intake` skill
(§7 procedure), then `rig-change` for the commit (§5.4 human ratification).
