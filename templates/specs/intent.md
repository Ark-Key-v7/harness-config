# INTENT — <slug>
derived_from: <operator directive | incident record | production breach>
last_reconciled: <date>
parent: none                              # intents are chain heads
status: draft                             # draft | approved

## Problem
<One paragraph. The observable wrongness in the world, not the solution.
Reframe test: if only one solution could fit this statement, you have
written a spec, not an intent. A good problem leaves room for more than
one answer.>

## Proposed outcome
<What the world looks like when this is done — observable and user-facing.
Still not the solution mechanism: outcomes, not features.>

## Affected users and systems
<Who feels the change (specific roles, not "users"); which systems,
services, and APIs are touched.>

## Constraints
<Binding limits: auth, PII, budget, latency, compatibility, existing
systems that must be reused. These compile into promises.md / rules.md
Zone C at PRD time, where they become enforceable law.>

## Success criteria
- <Observable criterion — verifiable without asking the author>
- <…>

## Out of scope
- <What this work will never do — compiles into promises.md Zone C out_of_scope>

## Open questions
- <Named unknowns. None may hide a requirement: an unknown is
  "TBD — needs validation", never an invented answer.>
