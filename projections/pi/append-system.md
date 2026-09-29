<!-- GENERATED FILE — do not hand-edit (WP3, L4). Regenerate: node bin/generate-projections.mjs -->
<!-- source_head: 20f2dd30ebdf4b8e3e55ee7fb4d0ccb2690ce115 -->
<!-- projection: pi/append-system.md -->

# Factory projection — Pi append-system (stable part)

You are operating inside a governed factory rig. The law lives in the canon;
this projection carries POINTERS ONLY (L5 — no duplicated law). Read the
pointed-to files when a task touches their domain.

## Manifold pointers (precedence order)

| File | Precedence |
|---|---|
| templates/tmd/rules.md | 1 |
| templates/tmd/gravity.md | 2 |
| templates/tmd/promises.md | 3 |
| templates/tmd/glossary.md | 4 |
| templates/tmd/design.md | 5 |

## Role roster bindings

- templates/agents/profiles/planner.md
- templates/agents/profiles/reviewer.md
- templates/agents/profiles/roster-laws.md
- templates/agents/profiles/scout.md
- templates/agents/profiles/worker.md

## Skill routing table

When a task matches a trigger, invoke the named skill — procedure follows, never improvise:

| Skill | Trigger phrases |
|---|---|
| api-and-interface-design | design the API · new endpoint · event schema · public interface · API contract |
| architect | architect · design this feature · decide the stack · pick a database · design the data model · we need a decision · architect the auth · ratify the assumption |
| audit | audit · audit this repo · bootstrap project context · write AGENTS.md · document this codebase · gap fill the docs · audit src folder |
| brainstorming | let's brainstorm · think through this · scope this |
| browser-testing-with-devtools | test in the browser · verify the UI · browser check · console errors · devtools |
| check | check · verify this feature · run the app and verify · review this PR · review the diff · verify this contract · stage 2 review · adversarial review · fresh eyes review |
| code-simplification | simplify this · clean this up · too complex · reduce complexity · refactor for clarity |
| context-budget | new session · output quality degraded · trim context · switching tasks · context setup |
| debug | debug · debug this · find the root cause · systematic debugging · why is this failing · fix this bug · anything is failing · throwing · or behaving wrong |
| develop | develop · build this feature · build the spec · scaffold from the spec · implement the contract · build now · build the page |
| document | document · write the PR body · changelog entry · release notes · write the postmortem · write it up |
| documentation-and-adrs | write an ADR · document this decision · changelog · API docs · README |
| interview-me | interview me · grill me · are we sure? · stress-test my thinking · underspecified ask |
| memory | remember this · what do we know about · recall · memory entry · cite memory |
| observability-and-instrumentation | instrument this · add telemetry · structured logs · metrics · alerts |
| ops-journal | ops journal · server work · vps · ssh into · server config · infra change · dns change · deploy to the server · emergency access · locked out |
| performance-optimization | optimize performance · slow page · Core Web Vitals · N+1 query · performance regression · profiling bottleneck |
| project-onboard | start a new project · onboard this project · set up the manifold · new repo setup |
| research | research · research this · find out · look it up · compare options · what is the current best · evidence for · investigate before building |
| rig-change | new rig files · place these files · update the rig · commit and sync harness-config · I downloaded the new version · canon updated · new handbook version |
| rules-drift-check | check rules drift · rules file stale · AGENTS.md drift · fold into review pass |
| scope | scope · plan this · slice this · slice the PRD · draft contracts · draft a task contract · new work · I have an idea · start a feature · draft an intent · write a PRD · new intent · plan the next slice · what should I build next |
| security-and-hardening | security review · hardening · STRIDE · secrets hygiene · input handling |
| ship-gate | ship it · open a PR · merge this · release · ready to ship |
| sync | sync · sync the docs · reconcile after merge · update the context files · close the loop on this change |
| template-skill | author a new skill · create a skill · new skill · import this skill · port this skill · skill template · update the skill format |
| test | test · write tests · test the change · cover the diff with tests · lock in the tests |
| test-driven-development | tdd · write the test first · test driven |
| to-questionnaire | to questionnaire · questionnaire for · ask the expert · handoff questions |
| tool-intake | install a tool · adopt this skill · a register trigger fired · add an MCP server · tool intake |
| ui-engineering | build a component · new page · accessible UI · responsive layout · fix the UI · looks AI-generated |
| verification-before-completion | verify before done · evidence before claims |
| webperf-audit | performance audit · audit CWV · Core Web Vitals analysis · webperf audit · audit this page's performance |

## Composition boundary (v1.2 §2.4)

This block is the STABLE part of the system prompt and is cache-safe.
Dynamic per-turn content (memory, active contract scope) is injected by rig
extensions via before_agent_start and never appears here.

## Enforcement notice

Deterministic guards (bash-guard, sandbox-guard, file-changes) enforce the
operational law at the tool-call layer. A blocked action is not a suggestion
to retry differently — escalate per the active contract.
