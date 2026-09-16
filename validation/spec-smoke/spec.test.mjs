/**
 * spec.test.mjs — deterministic driver for WP-A (Phase-0 spec chain).
 *
 * Canon: TCE v2.1 §2.A — intent → prd → plan → slice → contract; provenance
 * headers on every artifact; orphans are lint errors; contract trace: must
 * resolve to a committed plan slice.
 *
 * Fixtures: clean chain (pass), orphan PRD (fail), unresolvable contract
 * trace (fail), slice/contract trace mismatch (fail), oversize slice
 * touches (WARN, still passes), and the rig's own templates (template mode).
 *
 * Run from the repo:  node validation/spec-smoke/spec.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const TOOL = join(REPO, "bin", "lint-spec.mjs");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function lint(specsDir, args = []) {
  // spawnSync: WARN/FAIL lines are emitted on stderr — capture both streams
  // on success and failure alike.
  const r = spawnSync(process.execPath, [TOOL, specsDir, "--strict", ...args], { encoding: "utf8" });
  return { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
}

// --- Fixture builders -------------------------------------------------------------
function scaffold(root) {
  for (const d of ["specs/intent", "specs/prd", "specs/plans", ".agents/tasks"]) {
    mkdirSync(join(root, d), { recursive: true });
  }
  writeFileSync(join(root, "specs", "intent", "auth.md"), `# INTENT — auth
derived_from: operator directive 2026-09-01
last_reconciled: 2026-09-01
parent: none

## Problem
Sessions never expire.

## Success criteria
- Expired tokens are rejected

## Out of scope
- UI redesign
`);
  writeFileSync(join(root, "specs", "prd", "auth.md"), `# PRD — auth
derived_from: specs/intent/auth.md
last_reconciled: 2026-09-01

## Requirements (testable truths)
| ID | Requirement | Compiles to |
|---|---|---|
| R1 | expired tokens rejected | slice |
`);
  writeFileSync(join(root, "specs", "plans", "auth.md"), `# PLAN — auth
derived_from: specs/prd/auth.md
last_reconciled: 2026-09-01

## Slices (ordered)
### S1: session expiry
- crosses layers: domain
- touches: src/lib/domain/auth
- produces: expiry rejection
- contract: task-auth-s1
`);
  writeFileSync(join(root, ".agents", "tasks", "task-auth-s1.md"), `# Task Contract: auth expiry
manifest:
  contract_id: task-auth-s1
  trace: specs/plans/auth.md#S1
holdout: .agents/tasks/task-auth-s1.holdout.md
`);
}

// 1. Clean chain passes (strict)
{
  const P = mkdtempSync(join(tmpdir(), "spec-clean-"));
  scaffold(P);
  const r = lint(join(P, "specs"));
  check("clean chain VALID (strict)", r.code === 0);
  if (r.code !== 0) console.log(r.out);
}

// 2. Orphan PRD fails (derived_from does not resolve)
{
  const P = mkdtempSync(join(tmpdir(), "spec-orphan-"));
  scaffold(P);
  writeFileSync(join(P, "specs", "prd", "auth.md"), `# PRD — auth
derived_from: specs/intent/ghost.md
last_reconciled: 2026-09-01
`);
  const r = lint(join(P, "specs"));
  check("orphan PRD rejected", r.code === 1 && r.out.includes("orphan") && r.out.includes("prd/auth.md"));
}

// 3. Unresolvable contract trace fails (back-reference law)
{
  const P = mkdtempSync(join(tmpdir(), "spec-trace-"));
  scaffold(P);
  writeFileSync(join(P, ".agents", "tasks", "task-auth-s1.md"), `# Task Contract
manifest:
  contract_id: task-auth-s1
  trace: specs/plans/auth.md#S9
`);
  const r = lint(join(P, "specs"));
  check("unresolvable trace rejected (no S9 heading)", r.code === 1 && r.out.includes("S9"));
}

// 4. Slice/contract disagreement fails (plan names the contract, contract traces elsewhere)
{
  const P = mkdtempSync(join(tmpdir(), "spec-mismatch-"));
  scaffold(P);
  writeFileSync(join(P, ".agents", "tasks", "task-auth-s1.md"), `# Task Contract
manifest:
  contract_id: task-auth-s1
  trace: specs/plans/auth.md#S2
`);
  const r = lint(join(P, "specs"));
  check("slice/contract trace mismatch rejected", r.code === 1 && r.out.includes("trace"));
}

// 5. Missing provenance header fails
{
  const P = mkdtempSync(join(tmpdir(), "spec-header-"));
  scaffold(P);
  writeFileSync(join(P, "specs", "intent", "auth.md"), `# INTENT — auth
parent: none
`);
  const r = lint(join(P, "specs"));
  check("missing derived_from rejected", r.code === 1 && r.out.includes("derived_from"));
}

// 6. Intent without `parent: none` fails
{
  const P = mkdtempSync(join(tmpdir(), "spec-parent-"));
  scaffold(P);
  writeFileSync(join(P, "specs", "intent", "auth.md"), `# INTENT — auth
derived_from: operator directive
last_reconciled: 2026-09-01
`);
  const r = lint(join(P, "specs"));
  check("intent missing parent: none rejected", r.code === 1 && r.out.includes("parent: none"));
}

// 7. Oversize slice touches → WARN, still exit 0 (advisory, not the wall)
{
  const P = mkdtempSync(join(tmpdir(), "spec-size-"));
  scaffold(P);
  const many = Array.from({ length: 13 }, (_, i) => `src/m${i}`).join(", ");
  writeFileSync(join(P, "specs", "plans", "auth.md"), `# PLAN — auth
derived_from: specs/prd/auth.md
last_reconciled: 2026-09-01

## Slices
### S1: too wide
- touches: ${many}
- contract: task-auth-s1
`);
  const r = lint(join(P, "specs"));
  check("oversize slice touches warns but passes", r.code === 0 && r.out.includes("WARN") && r.out.includes(">12"));
}

// 8. The rig's own templates lint clean in template mode (default, non-strict)
{
  const r = spawnSync(process.execPath, [TOOL, join(REPO, "templates", "specs")], { encoding: "utf8" });
  const res = { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
  check("templates/specs lint clean (template mode)", res.code === 0);
  if (res.code !== 0) console.log(res.out);
}

// --- WP-E §5.2: the archive merge (change semantics) ------------------------------
{
  const MERGER = join(REPO, "bin", "archive-change.mjs");
  const root = mkdtempSync(join(tmpdir(), "spec-wpe-"));
  const merge = (change, extra = []) =>
    spawnSync(process.execPath, [MERGER, "--change", `specs/changes/${change}`, "--root", root, ...extra], { encoding: "utf8" });

  const delta = (slug, body) => {
    mkdirSync(join(root, "specs", "changes", slug), { recursive: true });
    writeFileSync(join(root, "specs", "changes", slug, "delta.md"), `---
change: ${slug}
derived_from: specs/prd/${slug}.md
last_reconciled: 2026-09-16
domains_touched: [billing]
---

# Delta: ${slug}

${body}
`);
  };

  // (1) all three section types → exact merged content
  delta("add-billing", `## ADDED Requirements

### REQ-billing-001: charge card
The system charges the card exactly once per order.

#### Scenario: charge
- **GIVEN** a paid-ready order
- **WHEN** the order is placed
- **THEN** exactly one charge exists

## MODIFIED Requirements

## REMOVED Requirements`);
  let r = merge("add-billing");
  check("merger: all-ADDED creates domain spec", r.status === 0);
  const specPath = join(root, "specs", "domains", "billing", "spec.md");
  let specText = existsSync(specPath) ? readFileSync(specPath, "utf8") : "";
  check("merger: ADDED requirement + provenance stamped", specText.includes("### REQ-billing-001: charge card") && /provenance: specs\/changes\/archive\/\d{4}-\d{2}-\d{2}-add-billing/.test(specText));
  check("merger: change archived (dated folder)", existsSync(join(root, "specs", "changes", "archive")) && !existsSync(join(root, "specs", "changes", "add-billing")));
  const archiveDir = readdirSync(join(root, "specs", "changes", "archive"))[0];
  check("merger: archive folder named <date>-<slug>", /-add-billing$/.test(archiveDir));

  delta("mod-billing", `## ADDED Requirements

### REQ-billing-002: refund
The system refunds fully on request.

#### Scenario: refund
- **GIVEN** a paid order
- **WHEN** a refund is requested
- **THEN** the charge is fully refunded

## MODIFIED Requirements

### REQ-billing-001: charge card
The system charges the card exactly once per order, idempotent by key.

#### Scenario: idempotent
- **GIVEN** a paid-ready order
- **WHEN** the order is placed twice with one key
- **THEN** exactly one charge exists

## REMOVED Requirements`);
  r = merge("mod-billing");
  specText = readFileSync(specPath, "utf8");
  check("merger: MODIFIED replaces block in full", r.status === 0 && specText.includes("idempotent by key"));
  check("merger: second ADDED appends next-free ID", specText.includes("REQ-billing-002"));

  // (2) MODIFIED against a missing ID → non-zero, ID named
  delta("bad-mod", `## ADDED Requirements

## MODIFIED Requirements

### REQ-billing-099: ghost
No such requirement.

#### Scenario: ghost
- **GIVEN** nothing
- **WHEN** nothing
- **THEN** nothing

## REMOVED Requirements`);
  r = merge("bad-mod");
  check("merger: MODIFIED against missing ID rejected, ID named", r.status === 1 && String(r.stderr).includes("REQ-billing-099"));

  delta("touch", `## ADDED Requirements

### REQ-billing-003: audit log
Every charge writes an audit entry.

#### Scenario: audit
- **GIVEN** a charge
- **WHEN** it completes
- **THEN** an audit entry exists

## MODIFIED Requirements

## REMOVED Requirements`);

  // (4) dry-run writes nothing
  r = merge("touch", ["--dry-run"]);
  check("merger: dry-run leaves change in place", r.status === 0 && existsSync(join(root, "specs", "changes", "touch")));

  // (3) hand-edited domain spec → manifest-guard halt
  writeFileSync(specPath, specText.replace("idempotent by key", "hand-edited text"));
  writeFileSync(specPath, readFileSync(specPath, "utf8").replace("idempotent by key", "hand-edited text"));
  r = merge("touch");
  check("merger: hand-edited domain spec halts on manifest guard", r.status === 1 && String(r.stderr).includes("drift"));

}

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
