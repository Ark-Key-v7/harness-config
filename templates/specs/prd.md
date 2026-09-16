# PRD — <slug>
derived_from: specs/intent/<slug>.md
last_reconciled: <date>
status: draft                             # draft | approved

## 1. Problem statement
<Who has what problem, and the cost of not solving it. Intent-framed,
never solution-prescriptive — the reframe test from the intent applies.>

## 2. Evidence
<What proves the problem is real: quote / data / observation —
or "Assumption — validate via [method]". Real signal beats invention.>

## 3. Thesis (why build this, why now)
<Why this, why now, and why it beats how users cope today.
Solving the pain is table stakes; the thesis must clear the switch bar.>

## 4. Hypothesis (falsifiable — the WRONG condition is mandatory)
We believe [change] will cause [these users] to [do Y], resulting in [outcome].
We'll know we're RIGHT if [leading signal] within [timeframe].
We'll know we're WRONG if [counter-signal / a guardrail moves].

## 5. Target user & JTBD
- Primary user: <role / context / trigger>
- JTBD: When [situation], I want [motivation], so I can [outcome]
- Non-users: <who this is explicitly NOT for>

## 6. Requirements (testable truths)
| ID | Requirement | Compiles to |
|---|---|---|
| R1 | <requirement as a verifiable statement> | rules.md Zone C / glossary.md / promises.md Zone C / slice |

<Test-seam rule: sketch the seams at which each requirement will be
tested. Prefer existing seams; use the highest seam possible; the fewer
seams across the codebase the better. No file paths or code snippets in
this table — they go stale immediately. Exception: a snippet that encodes
a decision more precisely than prose (state machine, schema, type shape)
may be inlined, trimmed to the decision-rich parts.>

## 7. MVP scope
<The thinnest line that proves the hypothesis end to end.
What is in. What is out.>

## 8. Success metrics (outcome-shaped, not "engagement")
| Metric | Target | How measured |
|---|---|---|

## 9. Non-goals
<What is explicitly NOT being done — reinforces the intent's out_of_scope
and feeds promises.md Zone C.>

## 10. Glossary additions
- <term>: <definition>          # → glossary.md Zone C at approval

## 11. Invariants
- <negative constraint>         # → rules.md Zone C at approval
  <e.g., pagination in <slice> capped at N pages (Law 13);
   model-output branches schema-validated (Law 15)>

## 12. Promises
- <temporal/network budget>     # → promises.md Zone C at approval

## 13. Open questions
- [ ] <named, not hidden>
