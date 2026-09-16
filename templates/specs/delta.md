---
change: "TEMPLATE_VALUE_REQUIRED — the slug; equals the change folder name"
derived_from: "specs/prd/<slug>.md"
last_reconciled: "TEMPLATE_VALUE_REQUIRED — date or SHA"
domains_touched: []                 # kebab-case domain names; drives the merge
---

# Delta: <change name>

**What this file is.** The diff between what the system does now and what it
will do when this change lands. Three section types, three merge actions:
ADDED appends to the domain spec; MODIFIED replaces the named requirement
block in full (you MUST quote the complete revised requirement); REMOVED
deletes it. Requirement IDs: new IDs for ADDED (REQ-<domain>-<nnn>, next free
number per domain); existing IDs for MODIFIED/REMOVED.

<!-- Authoring law (WP-E §4):
- Every requirement has >=1 scenario; a requirement without a scenario is
  untestable and fails lint (mirrors E.1's Gherkin-truth rule — one
  vocabulary, contract to spec).
- MODIFIED quotes the FULL revised requirement. Partial edits are forbidden —
  the merge is replace-block, not patch-text (this is what makes two parallel
  changes to different requirements of one domain conflict-free).
- A MODIFIED/REMOVED naming a requirement ID absent from the living spec is
  a lint failure, not a merge-time surprise.
-->

## ADDED Requirements

### REQ-<domain>-<nnn>: <name>
<requirement as one verifiable statement>

#### Scenario: <name>
- **GIVEN** <precondition>
- **WHEN** <action>
- **THEN** <observable outcome>

## MODIFIED Requirements

### REQ-<domain>-<nnn>: <name>   (must exist in specs/domains/<domain>/spec.md)
<complete revised requirement text — replaces, never patches>

#### Scenario: <name>
- **GIVEN** ... - **WHEN** ... - **THEN** ...

## REMOVED Requirements

### REQ-<domain>-<nnn>: <name>   (must exist in the living spec)
Removal reason: <one line — the why lands in the archive, not the living spec>
