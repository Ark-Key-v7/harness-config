# Scoped Priming (from cole prime-codebase / prime-backend / prime-frontend)

Session-start orientation, kept inside the L8 budget. Prime only the side of the codebase the session's work touches.

## Whole codebase (small repos / unclear scope)

1. `git ls-files` for tracked files; directory tree 3 deep, excluding node_modules/build artifacts.
2. Read the rules surface (AGENTS.md → .tmd/ law plane), READMEs at root and major directories.
3. Read entry points, core config (package.json, tsconfig, pyproject), key models/schemas.
4. `git log -10 --oneline` + `git status` for current state.

## Scoped (large repos — the L8-preserving move)

1. `git ls-files`, then identify the relevant root before reading anything: backend (`backend/`, `server/`, `api/`, `app/`, or `src/` when backend-only) or frontend (`frontend/`, `client/`, `web/`, `src/`, or `app/` for Next.js).
2. Read that root's README, its entry point, its route/registration index or router, its config, its data models or shared component library root.
3. Read **one or two representative feature slices** (route + service + model, or a representative component) to internalize the established patterns — this substitutes for reading broadly.
4. Skip files outside the chosen root unless they define a shared type or contract the work depends on.
5. `git log -10 --oneline` + `git status`, noting open migrations, pending schema changes, or in-progress work in the chosen area.

Output a scannable summary: stack, directory map with one-line purposes, observed patterns and conventions, current state, immediate concerns. Loading only one side keeps the context window light on full-stack codebases — that is the point of the skill.
