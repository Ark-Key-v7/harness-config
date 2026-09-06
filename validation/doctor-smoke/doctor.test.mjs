/**
 * doctor.test.mjs — deterministic driver for WP-B (autonomy evidence gate).
 *
 * Canon: Harness v1.3 §5.6 — elevation is doctor-gated, never self-declared;
 * max_level is computed from deterministic filesystem-detectable checks.
 *
 * Fixtures at levels 0–2 (level 3 requires WP-C machinery that does not yet
 * exist — its FAIL rows are the interlock working, and are asserted as such).
 * The doctor's suite check runs the rig's own validation spine (minus this
 * driver — a suite cannot contain itself); these fixtures therefore assert
 * against a green rig.
 *
 * Run from the repo:  node validation/doctor-smoke/doctor.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const DOCTOR = join(REPO, "bin", "doctor.mjs");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function doctor(target, args = []) {
  const r = spawnSync(process.execPath, [DOCTOR, "--target", target, ...args], { cwd: target, encoding: "utf8" });
  return { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
}

const SHA = "a".repeat(40);
const PRECEDENCE = { "rules.md": 1, "gravity.md": 2, "promises.md": 3, "glossary.md": 4, "design.md": 5 };
function writeManifold(root, { withRegistry = false } = {}) {
  mkdirSync(join(root, ".tmd"), { recursive: true });
  for (const [name, prec] of Object.entries(PRECEDENCE)) {
    const registry = name === "gravity.md" && withRegistry ? `
\`\`\`yaml
subgraphs:
  - name: auth
    paths: [src/lib/domain/auth/**]
    owning_role: worker
    write_scope: [src/lib/domain/auth/**, tests/auth/**]
    read_scope: [src/lib/domain/auth/**, tests/auth/**, src/lib/domain/shared/**]
    dependency_edges: [shared]
\`\`\`
` : "";
    writeFileSync(join(root, ".tmd", name), `---
manifold_version: 1.0.0
last_verified: ${SHA}
precedence: ${prec}
---
# ${name}

## ZONE A — THE LAW
## ZONE B — THE STRUCTURE
## ZONE C — FILLABLE SLOTS
${registry}
## Enforcement
This law names its wall.
`);
  }
}
function writeAutonomy(root, dial = 0, mergeQueue = false) {
  mkdirSync(join(root, ".agents"), { recursive: true });
  writeFileSync(join(root, ".agents", "autonomy.json"), JSON.stringify({
    $law: "Dial may only be set to a level ≤ doctor's verdict; demotion is always permitted (Harness v1.3 §5.6).",
    dial, ratified_by: "operator", ratified_at: "2026-09-01", merge_queue_live: mergeQueue, notes: "",
  }, null, 2) + "\n");
}
function writeSpecChain(root) {
  for (const d of ["specs/intent", "specs/prd", "specs/plans", ".agents/tasks"]) mkdirSync(join(root, d), { recursive: true });
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
\`\`\`yaml
manifest:
  contract_id: task-auth-s1
  manifold_version: 1.0.0
  sub_graph: auth
  read_closure: [shared]
  regime: subscription
  model_class: executor
  sizing_budget_tokens: 100000
  trace: specs/plans/auth.md#S1
inherit:
  rules: ["NO_UPSTREAM_LEAKS"]
  gravity: ["auth may not import from web-ui"]
  promises: ["external fetch timeout 5000ms"]
  glossary: ["Subscriber"]
must_haves:
  truths:
    - scenario: "Expired tokens are rejected"
      given: ["a session token past its expiry"]
      when: ["the middleware processes the request"]
      then: ["the request is rejected"]
  artifacts:
    - "src/lib/domain/auth/session.ts exists and passes tsc --noEmit"
holdout: .agents/tasks/task-auth-s1.holdout.md
validation_commands: ["npm test -- auth"]
iteration_budget: 5
timeout_seconds: 1800
exit_protocol: emits A2A Completion Payload (E.3)
\`\`\`
`);
}

// --- Level 0 fixture: manifold only ------------------------------------------------
{
  const P = mkdtempSync(join(tmpdir(), "doctor-l0-"));
  writeManifold(P);
  const r = doctor(P);
  check("L0 fixture: exit 0 (doctor reports)", r.code === 0);
  check("L0 fixture: max_level 0", r.out.includes("max_level: 0"));
  check("L0 fixture: specs FAIL names the next action", r.out.includes("spec-intake"));
}

// --- Level 1 fixture: + specs + autonomy.json ---------------------------------------
{
  const P = mkdtempSync(join(tmpdir(), "doctor-l1-"));
  writeManifold(P);
  writeAutonomy(P, 1);
  mkdirSync(join(P, "specs", "intent"), { recursive: true });
  mkdirSync(join(P, "specs", "prd"), { recursive: true });
  mkdirSync(join(P, "specs", "plans"), { recursive: true });
  const r = doctor(P);
  check("L1 fixture: max_level 1", r.out.includes("max_level: 1"));
  check("L1 fixture: holdout FAIL is the dial-2 gate", r.out.includes("dial 2 auto-merge requires holdouts"));
  const req1 = doctor(P, ["--require", "1"]);
  check("L1 fixture: --require 1 exits 0 (WP-B acceptance)", req1.code === 0);
  const req2 = doctor(P, ["--require", "2"]);
  check("L1 fixture: --require 2 exits 1 without holdouts (WP-B acceptance)", req2.code === 1 && req2.out.includes("REQUIRE FAILED"));
}

// --- Level 2 fixture: + holdout + passing contract + watchdog state -------------------
{
  const P = mkdtempSync(join(tmpdir(), "doctor-l2-"));
  writeManifold(P, { withRegistry: true });
  writeAutonomy(P, 2);
  writeSpecChain(P);
  writeFileSync(join(P, ".agents", "tasks", "task-auth-s1.holdout.md"), `holdout_for: task-auth-s1
scenarios:
  - scenario: "Expired tokens are rejected"
    given: ["a session token past its expiry"]
    when: ["the middleware processes the request"]
    then: ["the request is rejected"]
verification: raw
`);
  writeFileSync(join(P, ".agents", "queue.json"), "{}\n");
  writeFileSync(join(P, ".agents", "watchdog-state.json"), "{}\n");
  const r = doctor(P);
  check("L2 fixture: max_level 2", r.out.includes("max_level: 2"));
  if (!r.out.includes("max_level: 2")) console.log(r.out);
  check("L2 fixture: dial-3 FAILs are the interlock (mutation lane + merge queue)", r.out.includes("mutation lane") && r.out.includes("merge_queue_live"));
  const req2 = doctor(P, ["--require", "2"]);
  check("L2 fixture: --require 2 exits 0", req2.code === 0);
}

// --- Dial violation is loud -----------------------------------------------------------
{
  const P = mkdtempSync(join(tmpdir(), "doctor-violation-"));
  writeManifold(P);
  writeAutonomy(P, 3);
  const r = doctor(P);
  check("dial > verdict → DIAL VIOLATION printed", r.out.includes("DIAL VIOLATION"));
}

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
