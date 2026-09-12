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
- GitNexus PolyForm Noncommercial license decision (or bake-off resolution: GitNexus vs CodeGraph vs codebase-memory-mcp).
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
