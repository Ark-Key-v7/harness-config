# PHASE — <NN> <name>
derived_from: <docs/scope/ roadmap row | specs/prd/<slug>.md | operator directive>
last_reconciled: <date>
status: draft                             # draft | approved

<!-- A phase is a milestone, not a task. It bundles the intent, the PRD,
and the decisions for one stretch of the product's arc, written just
before that stretch starts — never all upfront. Slicing (specs/plans/)
decomposes it into contracts when it is too big for one. Single-feature
work skips the phase form and runs the chain directly. -->

## Goal
<One line: the state of the world when this phase passes its checks.>

## Build
<What this phase delivers — behavior, components, flows. Never filenames:
the structure is the builder's to choose, unless the phase amends one.>

## Constraints
<The rules this phase must not break — product invariants, sequencing,
the failure modes that would surface silently in later phases. The reason
carries the weight; a constraint without its why gets deleted by the next
reader.>

## Acceptance check
1. <Numbered, observable, and honest about who runs it: terminal checks
   first (the builder's, with the numbers to report), browser or judgment
   checks last (the operator's, seconds each).>

## Not in this phase
<Explicit exclusions — the next tempting thing, refused with a reason.
This section is the scope fence the build reads when it drifts.>
