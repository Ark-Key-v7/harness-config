# FACTORY_STATUS.md — Governance Plane State

_Rig: `harness-config` · Harness: pi-coding-agent 0.84.3 · Regime: Kimi OAuth subscription_
_This document is regenerated against the finished rig at each tagged release. It reports state; it does not restate law (canon lives in the handbooks and the TMD templates — L5)._

## Work package ledger (WP0–WP10)

| WP | Deliverable | Plane | Validation | Status |
|---|---|---|---|---|
| WP0 | Factory floor: Node 24.18.1, Pi 0.84.3, worktrunk, qmd, lancedb, semgrep, betterleaks, fallow, pr_agent (see `package-pins.json`) | floor | install-validated per pins ledger | ✅ |
| WP1 | Baseline extensions: `bash-guard`, `file-changes`, `memory-toggle`, `ask-user` | enforcement | 4 smoke drivers | ✅ |
| WP2 | `sandbox-guard` — contract-scoped write/read enforcement + stale-read guard | enforcement | 37-check driver | ✅ |
| WP3 | Projection generator + drift check + freshness assert (`generate/check/assert-projections`) | projection | 21-check driver | ✅ |
| WP4 | TMD manifold templates (rules/gravity/promises/glossary/design, three-zone, canon-verbatim) + AGENTS.md router | templates | `lint-tmd` + 10-check driver | ✅ |
| WP5 | Roster profiles: scout / planner / worker / reviewer (E.5) | templates | `lint-profiles` + 7-check driver | ✅ |
| WP6 | Skills: `rig-change`, `pr-review`, `tool-intake`, `template-skill` (E.6) | procedures | `lint-skills` + 11-check driver | ✅ |
| WP7 | Task Contract template (E.1) + `lint-contract` + `contract-scope` resolver | templates | 9-check driver incl. WP2 end-to-end | ✅ |
| WP8 | Project `.pi/` layer + `lint-mcp` curation gate + `seat-switch` extension + `pi-mcp-adapter` 2.31.0 pin | templates + enforcement | 15 + 14-check drivers | ✅ |
| WP9 | STATE.md schema (E.2) + genesis + `lint-state` + `wt.toml` hook contract + `lint-wt-hook` | templates | 17-check driver | ✅ |
| WP10 | `onboard-project` — fresh-project procedure (executable Phase 1 + projection) | templates | 14-check driver, full acceptance chain | ✅ |

## Plane architecture

1. **Enforcement (extensions/)** — operational law at the tool-call layer: bash-guard (DANGER rules), sandbox-guard (scope), file-changes, memory-toggle, ask-user, seat-switch. Blocking = fail-closed.
2. **Projection (projections/pi/)** — the stable, cache-safe system-prompt appendix + settings projection. Generated, never hand-edited; drift-checked against source HEAD.
3. **Templates (templates/)** — canon law verbatim in Zone A/B, fillable Zone C slots. Onboarded per project by `tools/onboard-project.mjs`.
4. **Procedures (templates/agents/skills/ → Pi skills)** — rig-change, pr-review, tool-intake, template-skill.
5. **Ledger** — `package-pins.json` (WP0 discovery + pins), `docs/GOVERNANCE_PLANE_SPEC.md` (the plan + deferred-tools register).

## L-law → plane mapping

| Law | Enforced by |
|---|---|
| L4 (manifest header, last_verified = SHA) | `lint-tmd.mjs` (rejects dates), WP4 headers |
| L5 (no duplicated law — reference, never restate) | WP3 projection design (pointers only); onboarding copies projection verbatim |
| Fail-closed boot (WP9 hook contract) | `lint-wt-hook.mjs` (order, abort-only, append-only) + `state-genesis.mjs` self-lint |
| Meta-Harness (§5.4 — human ratifies rig changes) | `rig-change` skill Step 5 confirmation; read-only deployed clone (pull-only chain) |
| Two-subdirectory rule (§3.9) | `.pi/.gitignore` (scope.json, memory.md); STATE.md per-worktree, never committed; `lint-state` topology check |
| Context Budget Law (§1.4) | injection caps in memory-toggle (8KB) and seat-switch (16KB); contract `sizing_budget_tokens` |
| Curation/pins (v1.2 §2.11, §7) | `lint-mcp.mjs`, `package-pins.json`, `tool-intake` skill |
| Dual failure vocabulary (E.2/E.3 reconciliation) | `lint-state.mjs` (both enums, never remapped) |

## Deferred-tools register

Lives in `docs/GOVERNANCE_PLANE_SPEC.md` §6 — statuses current as of this tag. Notable: Zed+pi-acp operator UI **validated** (extension commands don't cross ACP; extension commands bridged generically via `patches/pi-acp-command-bridge.patch` with idempotent apply script + smoke driver); AionUI remains a **PILOT** (gated on the inheritance test); `pi-mcp-adapter` is pinned but **pending install** (activates with the curated MCP stack); BetterDB/Headroom/Ponytail await their gates.

## Known open decisions (spec §9)

- Model-class mapping under Kimi-only subscription (provisionally: all classes resolve to the rig's Kimi model; `effort_level` is the live differentiator — stated in every profile's `substitution_bounds`).
- CLOSED (canon v2.0 ruling 7): codebase-memory-mcp is the graph engine of record; Graft standby; GitNexus out on license; CodeGraph out, revisit only on measured friction. Register §D.25.
- Gateway-tier deferral (regime activates when a gateway is adopted).
- AMUX↔Pi adapter boundary.

## Regeneration

After any rig change that alters the ledger above: update this file in the same commit (the `rig-change` skill's Step 6 checklist points here).

## WP11 — Refinery local lane + capability register + canon map (v2.2.0)

- `bin/preflight.mjs` + `templates/semgrep/base.yml`: Stage-0 local pre-flight
  (canon §6.3) — Semgrep injection floor + contract lane before every commit;
  Betterleaks lane warns until §D.6 adoption. `skills/pr-review/` v1.1.0 now
  REQUIRES the preflight trail before the Ten-Marks pass (Stage-4 trail-first law).
- `bin/check-activations.mjs` + `docs/activation-triggers.json`: deferred
  register triggers surface automatically at onboarding (T1–T4); the agent
  surfaces, the human ratifies — never autonomous integration.
- `docs/CAPABILITY_REGISTER.md`: integrated inventory + formalized deferred
  register (§D.1–§D.13). **Supersedes the deferred-tools register above**
  (GOVERNANCE_PLANE_SPEC §6 remains the historical plan).
- `docs/CANON_MAP.md`: canon → surface → status index. Canon is referenced,
  never chunked into rig docs (L5).
- `bin/onboard-project.mjs` v2: activation check after placement;
  `--brownfield` flag; preflight reminder in the handoff print.
- Drivers: `validation/refinery-lane/`, `validation/canon-register/`.

## WP12 — Canon coverage gap closure (register §D.15–§D.18 + CANON_MAP v1.2 index)

- Review of both handbooks (SDLC v2.0 canon + Harness Handbook v1.2) against
  the rig found three gap classes; all closed as registry/map work, no new
  builds:
  - **New deferred entries:** §D.15 trace ledger (observability spine — owns
    what §D.7/§D.12 presupposed), §D.16 in-harness loop health (doom-loop
    fingerprinting, state-aware rollback, reminder caps), §D.17 Pi-native
    sub-agent topology (validation-gated per v1.2 §4.3), §D.18 trigger-plane
    prompt templates (meta-prompts/ADWs/HOP).
  - **Named in place:** cross-worker collision guards inside §D.1 includes;
    two-part cache-aware composition rides §D.10.
  - **CANON_MAP §6:** v1.2 Parts II–V indexed (SOP rows for Operator Levers,
    Prompt Ladder, PETER, maturity model; rulings: Consolidated Ruling
    Registry stays canon-resident, Appendix A/B harnesses out of scope).
- Driver: `validation/canon-register/` section-count check relaxed to
  ≥14 (entries no longer require driver edits).

## Canon revision 2026-09 — TCE v2.1 + Harness v1.3 integrated
- New canon law: Phase 0 spec chain (TCE §2.A); Queue Operations §4.7; Gate
  Integrity §5.10; autonomy dial §5.6 (0–3, doctor-gated); E.1 holdouts.
- Work packages: WP-A spec chain & holdouts → WP-B doctor/dial + pr-review
  strengthening → WP-C gate integrity machinery (guard/ratchet/tripwire/
  mutations) → §D.19 queue machinery (trigger: first dial-2 request).
- Open decision: ZTE-class dial (>3) deferred headroom, register §D.19.
- Open decision: §D.21 eval substrate depends on §D.15 ledger.
- Canonical terminology (auditor map): Slice · Holdout truths · Autonomy dial
  (0–3) · Doctor · Floor/ratchet · Queue Operations Law (§4.7) · Gate
  Integrity Law (§5.10) · needs_human (+proposed-answer law) ·
  Intent/PRD/Plan chain · Watchdog D1–D6.

## WP-A — Phase-0 spec chain & holdouts (landed 2026-09, commit a594991)
- Landed: `templates/specs/` ×3, `bin/lint-spec.mjs` (header/orphan/
  back-reference law + size-cap WARN), contract `trace:`/`holdout:` law in
  `bin/lint-contract.mjs`, holdout read-deny in `bin/contract-scope.mjs`
  (fail-closed, reviewer-exempt), skills `spec-intake` + `slice-plan`,
  onboard scaffolding. Driver: `validation/spec-smoke/` + contract/onboard
  extensions.
- Deviation on record: seat state read from `~/.pi/agent/seat-state.json`
  (the real mechanism), not the spec's `.pi/seat`.

## WP-B — Doctor, dial, review strengthening (landed 2026-09)
- Landed: `bin/doctor.mjs` (deterministic checklist, max_level, `--require N`
  elevation gate), pr-review Step 0 (base-branch rulebook reading) +
  raw-output-wins verdict law, OPERATOR_GUIDE spec-intake/slice-plan loop +
  Autonomy section, FRESH_PROJECT_SOP interim queue discipline (§4.7 SOP).
- Known cost: the doctor's suite check re-runs the rig driver spine per
  invocation — doctor-smoke adds ~2.5 min to the full suite loop.

## WP-C — Gate integrity machinery (landed 2026-09)
- Landed: `bin/guard-list.mjs` (protected list, single source) +
  `extensions/guard.ts` (fail-closed write boundary) + `bin/guard.mjs` (CI
  twin, exit 2 violation / exit 1 undeterminable); `bin/floor-ratchet.mjs`
  (monotonic floors, `_MAX` ceilings, ratified lowering, slack report);
  `bin/tripwire.mjs` (provenance-based holdout-leak detection → STATE.md
  `failure_class: holdout_leak`); `validation/mutations/` lane (6 rungs,
  coverage law enforced, sensitivity proven live at build time);
  `state.schema.yaml` vocabulary += `needs_human`, `holdout_leak`.
- Drivers: guard-smoke (14), floor-smoke (9), tripwire-smoke (5),
  state-hook (19, +2 v1.3 fixtures), mutations (6 rungs).
- Register §D.22 CLOSED (Phase-0 machinery landed across WP-A–C).

## WP-D-1 — Skill format evolution (format v2.0.0)
- `skills/template-skill/` v2.0.0: two-class protocol (procedural |
  discipline, section 0), required "When NOT to Use" (4A), discipline-class
  skeleton (4B), folder anatomy (4C), IMPORT MODE for foreign SKILL.md (§5).
  v1 text preserved verbatim; additions marked [v2].
- `bin/lint-skills.mjs` v2 checks: metadata.class required (procedural |
  discipline); "When NOT to Use" section required in every skill; empty
  folders inside a skill dir fail.
- Migration (additive, D-1.3): all 7 skills carry metadata.class:
  procedural; existing skills gained a "When NOT to Use" section and a
  minor version bump. No v1 text deleted.
- Driver: `validation/skills-smoke/` extended to 11 checks (3 new
  negative fixtures).

## WP-D-2 — Superpowers adoptions (transformation-spec method)
- Ported from local clone of obra/superpowers (MIT), source SHA
  b36e0829c6d0140e93cfef2ca599b1b07d4a7797; byte-copy + enumerated edits
  only — truncation structurally impossible (acceptance = source diff).
- Four discipline-class skills landed: `test-driven-development`,
  `verification-before-completion`, `systematic-debugging` (+
  references/ ×3, scripts/find-polluter.sh — L12: local read-only helper),
  `brainstorming`.
- Recorded substitutions: terminal routing writing-plans → spec-intake
  (+dot-graph node, Documentation bullet); §4.7 Queue Operations
  harmonization replaced the 3-fix retry semantics in systematic-debugging
  (dangling 3+ references re-pointed); brainstorming Visual Companion
  section excluded → register §D.28 shelf.
- `bin/lint-skills.mjs` amendment: Act → Observe → Exit body form is
  procedural-only (discipline skeleton §4B replaces sections 1–4).
- Driver: skills-smoke 11 checks green; register + CANON bookkeeping in
  the same commit.

## WP-D-3 — Agent-skills adoptions + harvest patches (transformation-spec method)
- Source: addyosmani/agent-skills, intake clone pinned to the spec's
  reference SHA 48cb116 (HEAD drift on context-engineering — new
  "Restartable Session Boundaries" section — reported; pinning is the
  spec-sanctioned route; shared checklists verified zero-diff and copied
  from the repo-root references/ layout).
- Adopted (byte-copy + enumerated edits, acceptance = source diff):
  `ui-engineering` (renamed from frontend-ui-engineering) + references/
  accessibility-checklist; `performance-optimization` + references/
  performance-checklist; `interview-me`; `context-budget` (renamed from
  context-engineering); `webperf-audit` (agent→skill port of
  agents/web-performance-auditor.md, framing only, body verbatim).
- IMPORT MODE conformance recorded per skill (metadata.class +
  trigger_phrases; When NOT to Use added where the source lacked it):
  WP-D-1 format v2.0.0 is the declared dependency and lint gate.
- Harvests: idea-refine → spec-intake (Step 0 gate + divergent step);
  debugging-and-error-recovery → systematic-debugging (Stop-the-Line,
  non-reproducible tree, untrusted error output — frontmatter harvests
  record); planning/writing/executing-plans → slice-plan references/
  task-quality.md + task quality gate; requesting/receiving-code-review →
  pr-review dispatch + reception rules; constraint-driven-development →
  guard-the-bar five diff checks in bin/guard.mjs (WP-C name delta:
  gate-guard.mjs → guard.mjs), templates/CONSTRAINTS.md + project-onboard
  seed step, worker seat floor rules.
- guard.mjs bar checks: threshold-moved honors recorded ratification
  (ratified_lower / dated exception row) so the guard never contradicts
  §5.10.2; exception-appeared resolves rows against the ## Exceptions
  SECTION of the post-image file (Bars/Change-Log rows are not
  exceptions). Smoke-verified in a scratch repo: all five rules FAIL and
  waiver paths CLEAN.
- Register: skills row += 5 LIVE (webperf-audit procedural, four
  discipline); project-onboard row records CONSTRAINTS.md seeding;
  candidate shelf landed as NEW §D.29 (§D.28 is the brainstorming visual
  companion shelf — numbering delta noted) with §3 bake-off verdicts.
- Drivers: skills-smoke 11, guard-smoke 14, profiles-smoke 7,
  canon-register 138 all green; projections regenerated (16 skills),
  drift clean.

## WP-D-4 — cole/matt salvage + shelf finalization (transformation-spec method)
- Sources: coleam00/skills @ bb9f4d0 (newer than reference fb2e876 —
  verified zero diff on every file named by the spec, so the drift clause
  does not fire) and mattpocock/skills @ 3cca18b (exact reference SHA).
- Adopted (byte-copy + enumerated edits): `rules-drift-check` (from cole
  rules-check-drift; E1–E4 + IMPORT MODE conformance E5–E8, including the
  /piv-review-changes → pr-review-pass pointer strip per IMPORT MODE step
  3) and `to-questionnaire` (matt; E1 + conformance). pr-review gained the
  optional rules-drift step (E5 wire-in).
- Harvests: spec-intake += PRD guards, anti-fluff rule, hypothesis block
  (cole plan-create-prd), test-seam thinking (matt to-spec), door check;
  slice-plan += ticket export step; systematic-debugging += feedback-loop
  phase, ranked falsifiable hypotheses, DEBUG-tagging + scripts/
  hitl-loop.template.sh (byte-identical); interview-me += rounds mode +
  facts rule (matt grilling); context-budget += references/
  scoped-priming.md (Atlassian MCP Step 0 deliberately excluded); 
  template-skill += references/writing-for-agents.md + skill-mechanics.md
  (byte-identical) + author-mode wire-in.
- SPEC-VS-SOURCE MISMATCH REPORTED (wording level, no STOP condition — the
  matt clone is at the exact reference SHA): WP-D-4 spec §4.4 Edits 1–3 are
  quoted as "verbatim from source" but are a condensed edit of
  diagnosing-bugs @ 3cca18b (e.g. source "This is the skill." vs spec
  "This is the heart of debugging."). Acceptance (§6) is exactness to the
  SPEC's quoted text, so the spec text was inserted as written; the delta
  is recorded here and in the commit message.
- Register: skills row += 2 LIVE (rules-drift-check, to-questionnaire);
  final disposition shelf landed as §D.30 (§D.28/§D.29 retained: driver
  requires canon/trigger/path bullets per entry — the shelf carries them:
  trigger NONE, adopt-on-trigger rows self-trigger); standing rule added.
  **WP-D is CLOSED** — all seats single-occupied (L5), all provenance
  recorded.
- Drivers: skills-smoke, guard-smoke, profiles-smoke, canon-register,
  projections — green at commit time.

## WP-T — Template completion pack + spec-intake/slice-plan v2.0.0 (landed 2026-09)
- Landed: `templates/specs/{intent,prd,plan}.md` full enrichment (all
  canon slots preserved: derived_from/last_reconciled/parent headers,
  compiles-to mechanics, Zone C targets, slice caps; intent still one
  screen); skills `spec-intake` + `slice-plan` rebuilt to v2.0.0 — the
  v1.1.0 loop-integrity defect (free-floating prose between steps) is
  closed; harvested blocks preserved verbatim (PRD guards, anti-fluff,
  divergent-refinement lenses, test-seam, door check, ticket export).
- lint-spec.mjs verified against scratch drafts of all three enriched
  templates. One extension was required (recorded per WP-T §5.4): the
  enriched intent annotates `parent: none` with a trailing comment, so
  the header law now compares the value with the comment stripped —
  section names themselves are not hard-coded, so no accepted-section
  list change was needed.
- PENDING canon reconciliation (operator action, outside this rig-change):
  replace handbook Appendix 2.A templates with the repo's three, so canon
  and repo stop drifting.


## WP-STACK — stack pre-staging, four-part binding rule, seat-model addendum (landed 2026-09)
- Landed: corrected install policy in the register (STAGED posture between
  DEFERRED and LIVE; four-parts law: pin + install + seat wiring + skill
  pointer — a tool without its four parts is an orphan); seat-model addendum
  (OPERATOR_GUIDE rulings 1–3 table, provider-setup seat map, CANON_MAP
  Appendix C row); nine components staged with all four parts: ripgrep
  (driver), betterleaks 1.8.1 (binary — preflight lane 3 now has its
  scanner), serena 1.7.0 + codebase-memory-mcp 0.11.0 + context7 4.1.1 +
  headroom-ai 0.3.4 (MCP catalog `templates/mcp-catalog.json` + lint-mcp
  --catalog mode), openwiki 0.5.2 + openkb 1.0.22 (L3 substrate),
  qmd 0.1.2 (L4-private), tokenjuice 0.8.5 (L6 pilot);
  validation/stack-staging-smoke driver (42 checks); code-simplification
  Import-Mode adoption (verbatim + E1–E3, worker-seat binding); register
  layer tags + reason classes + Turborepo in §D.1 includes + the Semgrep
  local-floor ruling (§2.2).
- DEVIATIONS on record: (1) one WP commit carries all tools' four parts
  (the WP's "one commit per tool" and its single-confirmation land order
  conflict; the four-parts invariant is preserved per tool inside the one
  commit). (2) qmd smoke is CLI-level only — its index roundtrip downloads
  a ~600M-param embedding model from HF Hub (network-gated); that cost
  moves to activation time. (3) codebase-memory-mcp's postinstall fetches
  its platform binary on first run despite --ignore-scripts (L12 note in
  its pin). (4) Graft deliberately unstaged (standby — ruling 7).

## WP-E — Change semantics: living domain specs, deltas, archive merge (landed 2026-09)
- Landed (OpenSpec model adopted rig-native; CLI REJECTED — §D.30 shelf
  row): templates/specs/{domain-spec,delta}.md; bin/archive-change.mjs —
  deterministic merger with fail-closed preflight (scenario law, MODIFIED/
  REMOVED existence, ADDED next-free, domains_touched consistency,
  contract-verification gate) and a manifest guard that halts on hand-edited
  living specs; lint-spec delta/domain lint + orphan advisory; lint-contract
  optional requirements: [REQ-...] list validated against the delta;
  spec-intake v2.1.0 (Step 4b delta decision + baselining rule); slice-plan
  v2.1.0 (slices decompose delta requirements); onboard scaffolds
  specs/domains/ + specs/changes/archive/ (empty — brownfield-first, no
  backfill); CANON_MAP + register + OPERATOR_GUIDE ARCHIVE row.
- Interface note: the contract-verification gate reads a verified.md marker
  (the reviewer seat's E.4 PASS verdict) in the change folder when task
  contracts exist for the slug — the WP named "STATE/verdict trail" without
  a concrete artifact; verified.md is that artifact. Recorded for canon.

## WP-C2 — Canon alignment: fifteen laws, zones, nine-layer stack, Canon Compiler (landed 2026-09)
- Landed: rules.md fifteen-law Anti-Slop Protocol (L11–L15 verbatim; §1 law
  text adopted as canon, §0.7.1 inventory names recorded as aliases in the
  enforcement map) + Law Economy statement (15-law budget, placement ladder);
  zone realignment across all five templates/tmd (Zone B = project bindings,
  Zone C = PRD-compiled with MANDATORY derived_from/last_reconciled —
  lint-tmd upgraded to fail-closed); gravity A.7 long-lived-process law +
  §B.4 registry (L13 support); a2a-completion.schema.json (canon-verbatim) +
  README post-schema rules + contract/worker/onboard wiring; wt.toml
  task_contract_path alignment + declared variable inventory + lint-wt-hook
  enforcement; CANON_MAP §0 nine-layer stack map; register §D.23 (Archon —
  was a dangling reference caught by the new compiler), §D.25/§D.26/§D.27
  + §D.4/§D.8/§D.13 nine-layer updates + ripgrep L0 pin; GitNexus decision
  CLOSED (ruling 7); bin/canon-compile.mjs (9-check fail-closed document
  gate) + validation/canon-compile fixtures/driver.
- DEVIATION on record (§9 premise false): the WP asserted a YAML parser was
  already a lint-tmd dependency — it is not (lint-tmd is regex-based; no
  node_modules). canon-compile uses in-script structural parsers; zero new
  dependencies/pins beyond the ripgrep floor pin.
- Canon-level discrepancy RESOLVED (canon revision 2026-09-17): §0.7.1
  inventory now cites the §1 names verbatim (operator edit); the alias
  parentheticals in rules.md §A.4 and the security-and-hardening L13
  citation are dropped this commit. NOTE: the handbook file was edited in
  place (no dated predecessor kept — runbook diff-surface rule deviated;
  delta verified by direct read of the inventory table).

## WP-D-6 — Profiles, protocols, and promoted adoptions (landed 2026-09)
- Landed: five agent-skills promotions (api-and-interface-design,
  security-and-hardening, observability-and-instrumentation,
  documentation-and-adrs, browser-testing-with-devtools — verbatim + E1–E4;
  chrome-devtools actuation gated at §D.24); rig-native `ship-gate` skill
  (ci-cd/shipping harvests, verbatim, provenance in-file); profile
  `actuation_boundary.protocols` block in all four seats (deny-default) +
  lint-profiles §4.4 check; roster discipline bindings (scout/planner/
  reviewer); roster-laws.md (six Core Operating Behaviors, verbatim harvest)
  injected by seat-switch ahead of the profile (16KB concat cap asserted);
  §D.24/§D.28/§D.29/§D.30 register updates; T5-skill-shelf trigger;
  OPERATOR_GUIDE stage map; validation/wpd6-smoke driver.
- DEVIATION on record (format-law vs verbatim): the WP's E1 frontmatter blocks
  lack `trigger_phrases`/`author`, and api/security/observability bodies lack
  a "When NOT to Use" section — lint-skills format v2.0.0 (WP's own
  acceptance #3) requires both. Minimal additions applied (frontmatter fields;
  one "When NOT to Use" line each; a Procedural-form mapping section in
  browser-testing-with-devtools) and verified: every diff hunk vs the pinned
  source maps to an enumerated edit or one of these recorded additions.

## WP-F — JSM merger: nine-skill invocation plane (opened 2026-09-21)
- Decision of record (operator session 2026-09-21): JSM's nine skills
  (scope/audit/architect/develop/check/test/document/sync/debug) become the
  invocation plane; the rig keeps the enforcement plane (bins, lint gates,
  `.tmd/` law, contracts) and the discipline corpus. Build spec:
  `~/factory-rig/tmp/wp-f-jsm-merger/WP-F-build-spec.md` (all decisions
  D-1–D-6 resolved). Register: §D.33.
- **Phase 1 LANDED:** intake clone `sources/_intake/jsm-skills/` @
  `43b69e44` (v2.0.0, MIT, SHA-verified); `bin/lint-skills.mjs` v2.1.0
  (WP-F tooling harvest: byte budgets SKILL.md 32KB / support 24KB with 90%
  warn, description 400-char ratchet WARN — hard cap tightens in Phase 2/3,
  model-alias spawn-directive ban, contract-block byte-identity +
  unclosed-marker detection; dash/hyphen bans DECLINED); skills-smoke
  extended 11 → 18 checks, all green; `bin/token-usage.mjs` +
  `validation/token-usage-smoke/` (7 checks) — JSM cost-weight model ported
  to both seats (ZCode rollout JSONL dual usage shapes incl. subagent
  side-bucketing; Pi session JSONL with cost-object exclusion), live-smoked
  on real transcripts from both seats.
- Phases 2–5 PENDING: nine merges (one skill per commit, audit → … → debug)
  → completeness-gated retirements → `zcode-rig` plugin (Package A Z.13 ∪
  spec §6; in-client pass absorbs Z.12 V5/V6) → closeout.
- **Phase 2 progress: 1/9 — `audit` MERGED (2026-09-21).** JSM audit corpus
  (SKILL.md + 5 modes + 4 patterns + agent-prompt) byte-copied from the
  pinned clone; 7 of 10 files byte-identical; enumerated edits E1/E1b
  (descriptions-only law + governed-project WORKFLOW_SETUP signal), E2
  (greenfield onboard-scaffold offer), E4 (installs via tool-intake), E5
  (spec-path reality); recorded additions: E.6 frontmatter, When NOT to
  Use, Rig bindings, ACT→OBSERVE→EXIT mapping (WP-D-6 precedent).
  lint-skills regex also fixed to tolerate annotated `:START` markers
  (JSM's TOOL-CONSENT format) — caught by the merge, driver-verified.
- **Phase 2: ALL NINE MERGED (2026-09-21, one commit per skill).**
  `scope` (absorbs spec-intake v2.1.0 + slice-plan v2.1.0 as modes/
  spec.md + modes/slices.md, verbatim loops incl. harvested blocks;
  task-quality.md moved whole; governed continuation E1) · `architect`
  (9/10 files identical; D-1 canon amendment landed in CANON_MAP §1 per
  operator pre-authorization) · `develop` (10/10 identical; contract
  execution + ZCode subagent-per-contract posture E2 = the §1.2
  amendment) · `check` (pr-review v1.3.0 fully ported into review mode:
  trail-first, base-branch rulebook, must_haves→evidence, holdout run,
  Ten-Marks pass, reception rule, E.4/A2A/verified.md exit; verify gains
  contract must_haves + tier tail) · `test` (TDD precedence E1, REQ-ID
  traceability bridge, GATE_ONLY→check:fast) · `document` (ship-gate
  evidence-lead interface, ADR touchpoint) · `sync` (orchestrates
  archive-change + rules-drift-check + roadmap as steps; Boundaries
  table verbatim) · `debug` (absorbs systematic-debugging law blocks
  verbatim: Iron Law, Stop-the-Line, feedback-loop-first, ranked
  falsifiable hypotheses, DEBUG-tagging, ≤2-attempt escalation,
  untrusted error output; references/ + scripts/ moved whole).
  Acceptance per skill = source diff vs pinned clone; byte-identity
  counts: audit 7/10, scope 10/12, architect 9/10, develop 10/10,
  check 1/5+ported section, test 3/3, document 5/5, sync 1/2, debug
  5/5 (refs/scripts). Every changed hunk maps to an enumerated edit or
  recorded addition in the skill's frontmatter provenance.
- **Deviations/tools on record (Phase 2):** (1) lint budget overrides
  imported from JSM's own calibrated table (architect agent-prompt 32KB,
  design-conversation 29KB) + one for architect/SKILL.md 36KB (rig-law
  additions); (2) contract-block comparison is whitespace-normalized —
  upstream /sync carries the TOOL-CONSENT block indented inside a
  bullet; the words are identical, the nesting differs (recorded, not
  "fixed" against upstream bytes); (3) E.6 angle-bracket lint caught a
  WP-F frontmatter violation during the test merge (fixed in place);
  (4) §5 doc rewiring for retired-name references (OPERATOR_GUIDE
  lifecycle table, FRESH_PROJECT_SOP, profiles/roster) lands with
  Phase 3 retirements — until then old names still resolve; (5)
  systematic-debugging STAYS until the /debug trigger-parity check
  (Phase 3 protocol, §4.9) — parallel-run recorded, never silent.
- **Phase 3 LANDED (2026-09-21): completeness-gated retirements + §5 rewiring.**
  New gate `validation/merge-completeness/` (44 checks): every retired
  section mapped to its absorber keyphrase; exit 0 preceded deletion.
  RETIRED: `spec-intake` → /scope (spec mode); `slice-plan` → /scope
  (slices mode + references/task-quality.md); `pr-review` → /check
  (review mode). KEPT: `systematic-debugging` — trigger-parity check is
  PENDING in-client verification (a mid-build failure auto-invoking
  /debug on ZCode); per §4.9 it stays until verified, deviation recorded.
  §5 rewiring: OPERATOR_GUIDE (mental model, skills roster, lifecycle
  table), FRESH_PROJECT_SOP (review step), CANON_MAP (Phase-0 rows, SDLC
  Stage Map, Stage-4/Ten-Marks/raw-output/rulebook rows),
  templates/specs/plan.md, planner/reviewer profiles, bin/doctor.mjs
  failure hint, bin/onboard-project.mjs texts, bin/lint-spec.mjs
  comment; driver fixtures repointed (skills-smoke, canon-register,
  onboard-smoke, pi-acp-patch-smoke). Historical records (WP-D ledgers,
  the superseded-ruling quote) keep the old names by design.
  Drivers: lint VALID (32 skills) · skills-smoke 18/18 ·
  merge-completeness 44/44 · canon-register 184 PASS · doctor-smoke 11 ·
  onboard-smoke 18 · pi-acp-patch 40 · projections 21 · canon-compile
  green.
- **Sync chain COMPLETE (operator, 2026-09-21):** push `cc5ea86..b13a51d`
  (Phases 1–3, 14 commits incl. 3 pre-WP-F) → `~/.pi/agent` pulled
  fast-forward → stash restored. Deployed clone current; nine-skill
  surface live on the Pi seat.
- **Open item (governance): pi-observational-memory was installed directly
  into the deployed clone** (settings.json block + extensions/ + runtime
  state files: seat-state.json, memory-state.json, models-store.json) —
  violates the read-only/pull-only clone law; it jammed the first pull
  attempt (stash/pull/pop recovered, config preserved). Remediation:
  formal intake via rig-change from sources/_intake/pi-observational-memory/
  (pin + extension + settings block + register row), then the deployed
  clone returns to pure pull-only. Note: its observer/consolidator workers
  run passively on the Kimi seat — confirm that spend is intended.
- **Open item (Phase 4 input): systematic-debugging trigger parity** —
  retire it only after a live ZCode session shows /debug auto-invoking on
  a mid-build failure.

## WP-F open-item resolutions (landed 2026-09-21, pre-Phase-4)
- **Trigger parity RESOLVED.** Root cause of the pending state: the
  PORTABILITY step 2b bootstrap symlink (~/.agents/skills → deployed
  skills) had never been created on this machine — ZCode had NO discovery
  path to any rig skill. Created. New gate
  `validation/trigger-parity/` (15 checks) then proved surface parity
  (every discipline trigger phrase survives in /debug's frontmatter;
  activation concepts in the description; Iron Law verbatim in the body;
  discovery chain live both paths); systematic-debugging RETIRED on that
  green (merge-completeness assertion inverted to assert absence).
  DEVIATION on record: behavioral confirmation remains the first real
  mid-build failure auto-invoking /debug in a fresh ZCode session —
  surface parity is the proven mechanism; rollback = revert the
  retirement commit. Rig: 31 skills.
- **pi-observational-memory FORMALIZED (§D.34).** Extension byte-copied
  from the pinned shelf (@78a1efc, diff-verified identical to the
  deployed copy) into extensions/; settings block preserved verbatim;
  runtime state gitignored; pin recorded. Deployed-clone law restored:
  after push+pull the config arrives by commit, not by local edit.

## WP-F Phase 4 + 5 — zcode-rig plugin + closeout (landed 2026-09-21)
- **Phase 4:** `bin/generate-zcode-plugin.mjs` emits `projections/zcode-plugin/`
  (manifest, 4 seat agents from profiles, commands /rig:preflight +
  /rig:seat, hooks wiring, verbatim skills tree) — determinism law, L5
  (authoring copy canonical). Guard scripts are static assets
  (`templates/zcode-plugin-hooks/`): bash-guard (DANGER adapter;
  rule-name parity with extensions/bash-guard.ts asserted by driver;
  unparseable payload = LOUD deny by design) and scope-check
  (contract-scope.mjs's .pi/scope.json, harness-neutral; absent scope =
  ungoverned allow; crash = deny). Driver
  `validation/zcode-plugin-smoke/` 35 checks incl. live deny/allow
  behavior and byte-identical regeneration. `bin/check-zcode-plane.mjs`
  (plane check; client-config absence noted, not failed — enablement
  unverifiable pre-install). PORTABILITY: 2b amended (single-dir symlink
  supersedes per-skill loop), 2d added (plugin install).
- **DEVIATIONS on record (Phase 4):** (1) hooks.json uses the
  Claude-compatible PreToolUse shape per Package A Z.2 [DOCS] — field
  names UNVERIFIED in-client until first live run (a loud deny will
  surface any mismatch by design); (2) agent model pinning left as
  commented slots (V5 UNVERIFIED); (3) seat UserPromptSubmit injection
  hook (Z.13.1.5) NOT shipped — commands carry /rig:seat as
  operator-invoked; the injection hook lands with the in-client pass;
  (4) per-skill 2b loop replaced by dir symlink (improvement, recorded).
- **Phase 5 closeout:** WP-F complete. Rig surface: 31 skills (nine
  invocation plane + specialists), four retirements proven by
  merge-completeness (44) + trigger-parity (15). Remaining UNVERIFIED
  items (all in-client, operator-observable): hooks schema on first
  live run; /debug auto-trigger on first live failure; V5 model
  pinning; V6 wiki. Rollback for each = the named commit.
