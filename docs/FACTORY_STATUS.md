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
| WP6 | Skills: `rig-change`, `pr-review`, `tool-intake`, `template-skill` (E.6) | procedures | `lint-skills` + 8-check driver | ✅ |
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
