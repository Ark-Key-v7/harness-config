# AGENTS.md — Root Router (router law only — ≤50 lines, zero constraint text)

## ZONE A — THE LAW (compressed boundary rules, fixed)
This file is a ROUTER, not a legislature. It contains no constraint text.
All law lives in /.tmd/ (the manifold); all harness markdown lives in
/.agents/. Rules restated here will drift and are therefore forbidden.
Cap: 50 lines. Distributed instruction files below repo root are forbidden.
Precedence: rules.md > gravity.md > promises.md > glossary.md > design.md.
On any cross-file contradiction: halt, emit MANIFOLD_CONFLICT, wait for a
human PR (Conflict Halt — see any manifold file's Zone A).

## ZONE B — ROUTING MAP (fixed skeleton; fill the slots in Zone C)
- Manifold (supreme law): /.tmd/ — read the file whose domain your task
  touches. Precedence table and Conflict Halt: every manifold file, Zone A.
- Role profiles: /.agents/profiles/ — your seat's actuation boundary.
- Skills: /.agents/skills/ — trigger via frontmatter; procedures execute,
  they are not advice.
- Task contract: the active contract binds you to a sub-graph; the sandbox
  guard enforces it. Out-of-scope writes and reads are blocked, not advised.

## ZONE C — FILLABLE SLOTS (project-specific)
- Build: TEMPLATE_VALUE_REQUIRED <!-- e.g. "npm run build" -->
- Test: TEMPLATE_VALUE_REQUIRED <!-- e.g. "npm test — determinism law in .tmd/promises.md §4" -->
- Lint: TEMPLATE_VALUE_REQUIRED <!-- e.g. "npm run lint && node tools/lint-tmd.mjs" -->
- Stack: TEMPLATE_VALUE_REQUIRED <!-- e.g. "SvelteKit + TypeScript + pnpm; node version pinned in .node-version" -->
- Sub-graphs: see /.tmd/gravity.md — Sub-Graph Registry (never list nodes here; the Registry is the single source).

## POINTER FOR THIRD-PARTY TOOLING
This router exists for interoperability with third-party agents. If your
harness supports context files beyond this one, read /.tmd/ directly —
never ask this file to carry constraint text.
