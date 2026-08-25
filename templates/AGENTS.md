# Agent Router

This file routes agents to governing material. It contains no project law.

## Read order

1. Read `.tmd/rules.md`.
2. Read `.tmd/gravity.md`.
3. Read `.tmd/promises.md`.
4. Read `.tmd/glossary.md`.
5. Read `.tmd/design.md`.
6. Read the applicable profile in `.agents/profiles/`.
7. Read the applicable skill in `.agents/skills/`.
8. Read the task contract in `.agents/tasks/`.

## Boundary

- Obey the manifold precedence order.
- Do not mutate governing-layer files autonomously.
- Stop on conflicts instead of resolving them silently.
- Keep task execution inside the assigned worktree or sandbox.
