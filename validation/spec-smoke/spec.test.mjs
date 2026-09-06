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

import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
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

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
