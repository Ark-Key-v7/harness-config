#!/usr/bin/env node
/**
 * lint-state.mjs — WP9 STATE.md validator (E.2 + canon reconciliation).
 *
 * Validates a live STATE.md instance: strict YAML schema — all keys
 * required; unknown keys forbidden. Canon keys remain required and
 * unchanged (resolved_invariants, active_blockers, tool_trace, next_action,
 * finops); the chaining family (run_id, parent_trace_id, prior_step_refs,
 * artifact_pointers) is required as keys (null allowed — lineage may be
 * empty at genesis); the dual failure vocabulary is enforced as two
 * separate enums, never remapped.
 *
 * Also enforces the topology law: STATE.md must sit at a worktree ROOT —
 * never inside .tmd/, .agents/, or .pi/ (it is per-worktree, never shared,
 * never committed to the product repository).
 *
 * Usage: node bin/lint-state.mjs <STATE.md>
 * Exit 0 = valid. Exit 1 = violations (each printed).
 */

import { existsSync, readFileSync } from "node:fs";

const FILE = process.argv.slice(2).find((a) => !a.startsWith("--"));

let violations = 0;
const bad = (m) => { violations++; console.error(`INVALID | ${m}`); };

if (!FILE || !existsSync(FILE)) {
  console.error("usage: node bin/lint-state.mjs <STATE.md>");
  process.exit(1);
}

// Topology law: per-worktree root only.
if (/\/(\.tmd|\.agents|\.pi)\//.test(FILE)) {
  bad(`STATE.md must live at the worktree root — never inside .tmd/, .agents/, or .pi/`);
}

let text = readFileSync(FILE, "utf8");
// Tolerate a fenced ```yaml block; the body is the schema instance.
const fence = text.match(/```ya?ml\n([\s\S]*?)```/);
if (fence) text = fence[1];

// --- Required top-level keys (union of canon + E.2 chaining family) ------------
const REQUIRED = [
  "state_version", "trace_id", "run_id", "parent_trace_id", "prior_step_refs",
  "session_id", "task_contract", "contract_id", "worktrunk_path", "branch",
  "status", "position", "must_haves_status", "resolved_invariants",
  "active_blockers", "artifact_pointers", "tool_trace", "next_action",
  "finops", "failure_class", "error_class",
];
const topKeys = [...text.matchAll(/^([a-z_]+):/gm)].map((m) => m[1]);
for (const k of REQUIRED) {
  if (!new RegExp(`^${k}:`, "m").test(text)) bad(`missing required key: ${k}`);
}
for (const k of topKeys) {
  if (!REQUIRED.includes(k)) bad(`unknown key forbidden by the strict schema: ${k}`);
}

// --- Enums ----------------------------------------------------------------------
if (!/^status:\s*(in_progress|blocked|complete|failed)\s*(#.*)?$/m.test(text)) {
  bad("status must be in_progress|blocked|complete|failed");
}
const FAILURE = "type_error|test_failure|timeout|budget_severance|loop_detected|manifold_conflict|scope_denial|needs_human|holdout_leak";
if (!new RegExp(`^failure_class:\\s*(null|${FAILURE})\\s*(#.*)?$`, "m").test(text)) {
  bad(`failure_class must be null or a canon verdict (${FAILURE.replaceAll("|", ", ")}) — never a remapped error_class`);
}
const ERROR = "permission|file_not_found|syntax|rate_limit|timeout|edit_mismatch";
if (!new RegExp(`^error_class:\\s*(null|${ERROR})\\s*(#.*)?$`, "m").test(text)) {
  bad(`error_class must be null or an execution-error class (${ERROR.replaceAll("|", ", ")}) — never a remapped failure_class`);
}

// --- finops block ------------------------------------------------------------------
if (!/^finops:\n(\s+[a-z_]+:.*\n?)+/m.test(text)) bad("finops block missing or empty");
if (!/^\s+regime:\s*(gateway|subscription)\s*(#.*)?$/m.test(text)) bad("finops.regime must be gateway|subscription");

// --- Dual-vocabulary consistency: a failure carries whichever applies --------------
const status = text.match(/^status:\s*(\S+)/m)?.[1];
const fc = text.match(/^failure_class:\s*(\S+)/m)?.[1];
const ec = text.match(/^error_class:\s*(\S+)/m)?.[1];
if (status === "failed" && fc === "null" && ec === "null") {
  bad("status=failed but both failure_class and error_class are null — a failure carries whichever vocabulary applies");
}

if (violations > 0) {
  console.error(`\nINVALID — ${violations} violation(s)`);
  process.exit(1);
}
console.log(`VALID — STATE.md conforms to E.2 (status: ${status})`);
