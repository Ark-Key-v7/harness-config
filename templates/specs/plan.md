# PLAN — <slug>
derived_from: specs/prd/<slug>.md
last_reconciled: <date>
status: draft                             # draft | approved

## Architecture decisions
<Key decision + rationale, one per line. The SDLC "Design" stage lives
here: architecture decisions are recorded in the plan and in the
contracts' seam choices — there is no separate design stage (L5).>

## Global constraints
<Project-wide requirements carried down from the PRD — version floors,
dependency limits, naming rules — one line each, exact values copied
verbatim from the PRD. Every slice implicitly includes this section.>

## Slices (ordered; each ≤500 prod lines / ≤12 files / ≤1500 total — Harness §4.7)

### S1: <slice name>
- crosses layers: <domain | interface | infrastructure — must cross all present layers>
- touches: <directories>
- produces: <visible, testable output>
- depends on: <S# or "none">
- contract: task-<slug>-s1             # drafted by /scope (slices mode)

### S2: …

<Task-quality rules apply to every slice and are referenced, never
restated (L5): skills/scope/references/task-quality.md —
sizing table, no-placeholders list, Consumes/Produces interface notes,
never-overwrite rule. A slice that exceeds the caps is decomposed here,
in the plan, while decomposition is cheap — never mid-execution.>

## Checkpoints
- After S<#>: <what must be green — tests, build, core flow; human review point>

## Risks and mitigations
| Risk | Impact | Mitigation |
|---|---|---|

## Open questions
- <needing human input>
